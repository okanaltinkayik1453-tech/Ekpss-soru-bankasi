// --- FIREBASE VE ANALİTİK YAPILANDIRMASI ---
const firebaseConfig = {
  apiKey: "AIzaSyB3E9P2FOLLrLr89fLAYYLJqBRuiFPfVGs",
  authDomain: "ekpssdenemeleri.firebaseapp.com",
  projectId: "ekpssdenemeleri",
  storageBucket: "ekpssdenemeleri.firebasestorage.app",
  messagingSenderId: "154840518622",
  appId: "1:154840518622:web:2027407531bfff65cd174f",
  measurementId: "G-0KB8GTBNWQ",
  databaseURL: "https://ekpssdenemeleri-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const analytics = firebase.analytics();

// --- AYARLAR VE DEĞİŞKENLER ---
const TOPLAM_DENEME_SAYISI = 1; 
let mevcutSorular = [], mevcutIndex = 0, kullaniciCevaplari = [];
let kalanSure = 100 * 60, timerInterval, odaKodu = "";
let isSinglePlayer = false, secilenDenemeID = "", odaKatilimciSayisi = 0;
let sonPuanVerisi = null, sinavBittiMi = false;

// --- 1. BAĞLANTI KURTARMA (RECONNECTION) ---
window.onload = () => {
    const kaydedilmisOda = localStorage.getItem('aktifOda');
    const kayitZamani = localStorage.getItem('kayitZamani');
    if (kaydedilmisOda && (Date.now() - parseInt(kayitZamani) < 300000)) {
        sesliBildiri("Sınava kaldığınız yerden devam ediyorsunuz.");
        odaKodu = kaydedilmisOda;
        secilenDenemeID = localStorage.getItem('secilenDenemeID');
        testiYukleVeBaslat(secilenDenemeID, true);
    }
};

// --- 2. GİRİŞ VE ANA MENÜ ---
const btnLogin = document.getElementById('btn-google-login');
const girisEkrani = document.getElementById('giris-ekrani');
const odaYonetimi = document.getElementById('oda-yonetimi');
const sinavEkrani = document.getElementById('sinav-ekrani');

btnLogin.onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((res) => {
        girisEkrani.style.display = 'none';
        odaYonetimi.style.display = 'block';
        anaMenuGoster(res.user.displayName);
    });
};

function anaMenuGoster(isim) {
    odaYonetimi.innerHTML = `
        <h2 id="menu-baslik" tabindex="-1">Hoş geldin, ${isim}</h2>
        <div class="sol-sutun-butonlari">
            <div style="margin-bottom:15px; border:1px solid #444; padding:15px; background:#1a1a1a;">
                <label for="hedef-oyuncu-input">Toplam Katılımcı Sayısı (Örn: 4):</label>
                <input type="number" id="hedef-oyuncu-input" value="1" min="1" max="10" style="width:100%; padding:10px; margin-top:5px; background:#000; color:#fff; border:1px solid #ffff00;">
                <button class="ana-menu-karti" onclick="odaKur()" style="margin-top:10px;">ÇOKLU SINAV KUR (ODA SAHİBİ)</button>
            </div>
            <button class="ana-menu-karti" onclick="odaKatilHazirlik()">ÇOKLU SINAVA GİR (KOD İLE)</button>
            <button class="ana-menu-karti" onclick="denemeListesiGoster()" style="background:#ffff00; color:#000;">TEK KİŞİLİK SINAV BAŞLAT</button>
        </div>
        <div id="oda-islem-alani" style="display:none; margin-top:20px;">
            <input type="number" id="oda-kodu-input" placeholder="4 Haneli Şifre" style="width:100%; padding:15px; font-size:1.5rem;">
            <button id="btn-onay" class="nav-buton" style="width:100%; margin-top:10px;" disabled>OYUNCULAR BEKLENİYOR...</button>
        </div>`;
    document.getElementById('menu-baslik').focus();
}

function denemeListesiGoster() {
    isSinglePlayer = true;
    let listeHtml = `<h2 id="d-liste-baslik" tabindex="-1">Lütfen Bir Deneme Seçiniz</h2><div class="sol-sutun-butonlari">`;
    for (let i = 1; i <= TOPLAM_DENEME_SAYISI; i++) {
        listeHtml += `<button class="test-link" onclick="testiYukleVeBaslat('deneme${i}')">EKPSS Deneme ${i} (60 Soru)</button>`;
    }
    listeHtml += `</div><button class="nav-buton" onclick="location.reload()">Geri Dön</button>`;
    odaYonetimi.innerHTML = listeHtml;
    document.getElementById('d-liste-baslik').focus();
}

// --- 3. ÇOKLU OYUNCU VE ODA MANTIĞI ---
function odaKur() {
    const hedef = parseInt(document.getElementById('hedef-oyuncu-input').value) || 1;
    odaKodu = Math.floor(1000 + Math.random() * 9000).toString();
    db.ref('odalar/' + odaKodu).set({ durum: 'bekliyor', kurucu: auth.currentUser.displayName, oyuncuSayisi: 1, hedefOyuncu: hedef });
    
    db.ref('odalar/' + odaKodu).on('value', snap => {
        const d = snap.val(); if (!d) return;
        odaKatilimciSayisi = d.oyuncuSayisi;
        const btn = document.getElementById('btn-onay');
        if (odaKatilimciSayisi >= d.hedefOyuncu) {
            if(btn.disabled) sesliBildiri("Tüm adaylar odaya katıldı. Sınavı başlat düğmesi aktif.");
            btn.disabled = false; btn.innerText = "SINAVI ŞİMDİ BAŞLAT"; btn.style.background = "#00ff00"; btn.style.color = "#000";
        } else {
            btn.disabled = true;
            btn.innerText = `OYUNCULAR BEKLENİYOR (${odaKatilimciSayisi}/${d.hedefOyuncu})`;
        }
        if (d.durum === 'basladi') testiYukleVeBaslat('deneme1');
    });

    document.getElementById('oda-islem-alani').style.display = 'block';
    document.getElementById('oda-kodu-input').value = odaKodu;
    document.getElementById('btn-onay').onclick = () => db.ref('odalar/' + odaKodu).update({ durum: 'basladi' });
    sesliBildiri("Oda kuruldu. Paylaşmanız gereken şifre " + odaKodu.split('').join(' '));
}

function odaKatilHazirlik() {
    document.getElementById('oda-islem-alani').style.display = 'block';
    document.getElementById('oda-kodu-input').focus();
    document.getElementById('btn-onay').disabled = false;
    document.getElementById('btn-onay').innerText = "ODAYA GİR VE BEKLE";
    document.getElementById('btn-onay').onclick = () => {
        odaKodu = document.getElementById('oda-kodu-input').value;
        db.ref('odalar/' + odaKodu).transaction(c => { if(c) c.oyuncuSayisi++; return c; });
        db.ref('odalar/' + odaKodu + '/durum').on('value', snap => { if(snap.val() === 'basladi') testiYukleVeBaslat('deneme1'); });
        sesliBildiri("Odaya girildi, kurucu bekleniyor.");
    };
}

// --- 4. SINAV MOTORU VE ERİŞİLEBİLİRLİK ---
function testiYukleVeBaslat(dID, isRecover = false) {
    secilenDenemeID = dID;
    fetch(`./data/${dID}.json`).then(res => res.json()).then(data => {
        mevcutSorular = data[0].sorular;
        kullaniciCevaplari = isRecover ? JSON.parse(localStorage.getItem('cevaplar')) : new Array(mevcutSorular.length).fill(null);
        localStorage.setItem('aktifOda', odaKodu); localStorage.setItem('secilenDenemeID', dID); localStorage.setItem('kayitZamani', Date.now());
        
        odaYonetimi.style.display = 'none'; sinavEkrani.style.display = 'block';
        sinavEkrani.innerHTML = `<div id="timer-kutusu" class="timer-yuvarlak" aria-hidden="true"><span id="dakika">100</span>:<span id="saniye">00</span></div><div id="deneme-govde"></div>`;
        
        const rIndex = isRecover ? (parseInt(localStorage.getItem('sonIndex')) || 0) : null;
        if(rIndex !== null) soruyuGoster(rIndex);
        else {
            document.getElementById('deneme-govde').innerHTML = `<div class="soru-kutusu"><h2 id="b-baslik" tabindex="-1">Sınav Başladı. Bölüm Seçiniz.</h2><div class="navigasyon-alani"><button class="nav-buton" onclick="soruyuGoster(0)">GENEL YETENEK</button><button class="nav-buton" onclick="soruyuGoster(30)">GENEL KÜLTÜR</button></div></div>`;
            sesliBildiri("Süreniz başladı. Bölümünüzü seçin.");
            document.getElementById('b-baslik').focus();
        }
        baslatSayac(); 
    });
}

function soruyuGoster(index) {
    mevcutIndex = index; if (index === 30) sesliBildiri("Genel Kültür bölümüne geçtiniz.");
    localStorage.setItem('sonIndex', index); localStorage.setItem('cevaplar', JSON.stringify(kullaniciCevaplari));
    
    const soru = mevcutSorular[index];
    let html = `
        <div class="soru-kutusu">
            <h2 id="s-no" tabindex="-1">Soru ${index + 1}</h2>
            ${soru.tip === "turkce" ? `<p class="soru-koku-vurgu">${soru.soruKoku}</p><ul role="list">${soru.icerik.map((it, i) => `<li role="listitem">(${i+1}) ${it}</li>`).join('')}</ul>` : ""}
            ${soru.tip === "matematik" ? `<div role="text" aria-label="${soru.sesliBetimleme}"><p>${soru.gorselMetin}</p></div>` : ""}
            <div class="siklar-grid">
                ${["A","B","C","D","E"].map((h, i) => `<button class="sik-butonu ${kullaniciCevaplari[index]===h?'dogru':''}" onclick="isaretle('${h}')">${h}) ${soru.secenekler[i]}</button>`).join('')}
            </div>
            <div class="navigasyon-alani">
                <button class="nav-buton" onclick="soruyuGoster(${index-1})" ${index===0?'disabled':''}>Geri</button>
                <button class="nav-buton" onclick="bosBirak()">Boş Bırak</button>
                <button class="nav-buton" onclick="sonrakiSoru()">İleri</button>
            </div>
        </div>`;
    document.getElementById('deneme-govde').innerHTML = html;
    setTimeout(() => document.getElementById('s-no').focus(), 100);
}

function isaretle(h) { kullaniciCevaplari[mevcutIndex] = h; sesliBildiri(h + " işaretlendi."); sonrakiSoru(); }
function bosBirak() { kullaniciCevaplari[mevcutIndex] = null; sesliBildiri((mevcutIndex + 1) + ". soru boş."); sonrakiSoru(); }
function sonrakiSoru() { if (mevcutIndex < mevcutSorular.length - 1) soruyuGoster(mevcutIndex + 1); else bitisOnayEkrani(); }

function bitisOnayEkrani() {
    const b = kullaniciCevaplari.filter(c => c === null).length;
    document.getElementById('deneme-govde').innerHTML = `
        <div class="soru-kutusu">
            <h2 id="bitis-h" tabindex="-1">Sınav Tamamlandı</h2>
            <p>${b > 0 ? b + " adet boşunuz var." : "Boşunuz yok."}</p>
            <div class="navigasyon-alani">
                <button class="nav-buton" onclick="bosDon()">BOŞLARA DÖN</button>
                <button class="nav-buton" onclick="puanHesapla()">PUANI HESAPLA</button>
            </div>
        </div>`;
    document.getElementById('bitis-h').focus();
}

function bosDon() { const i = kullaniciCevaplari.indexOf(null); if (i !== -1) soruyuGoster(i); else puanHesapla(); }

// --- 5. PUANLAMA VE ANALİZ ---
function puanHesapla() {
    if(sinavBittiMi) return; sinavBittiMi = true; localStorage.clear();
    let y = {d:0, y:0}, k = {d:0, y:0}, analiz = {};
    kullaniciCevaplari.forEach((cev, i) => {
        const s = mevcutSorular[i]; const h = i < 30 ? y : k;
        const dMu = (cev === s.dogru_cevap);
        if (cev !== null) { if(dMu) h.d++; else h.y++; }
        if(!analiz[s.konu]) analiz[s.konu]={d:0,y:0};
        if(dMu) analiz[s.konu].d++; else if(cev!==null) analiz[s.konu].y++;
    });
    const nY = y.d - (y.y/4), nK = k.d - (k.y/4), tN = nY + nK, p = tN * 1.6;
    sonPuanVerisi = { y, k, nY, nK, p, analiz };
    db.ref('kullanicilar/' + auth.currentUser.uid + '/cozulenDenemeler/' + secilenDenemeID).set({ puan: p.toFixed(2), net: tN.toFixed(2), tarih: Date.now() });
    if (!isSinglePlayer) db.ref('odalar/' + odaKodu + '/sonuclar/' + auth.currentUser.uid).set({ isim: auth.currentUser.displayName, net: tN, sure: (6000-kalanSure), matD: y.d });
    sonucEkraniGoster();
}

function sonucEkraniGoster() {
    const { y, k, nY, nK, p } = sonPuanVerisi;
    document.getElementById('deneme-govde').innerHTML = `
        <div class="soru-kutusu">
            <h2 id="res-h" tabindex="-1">Sınav Sonucunuz</h2>
            <table border="1" style="width:100%; border-collapse:collapse; text-align:center;" aria-label="Sonuç Tablosu">
                <thead><tr><th>Bölüm</th><th>Doğru</th><th>Yanlış</th><th>Net</th></tr></thead>
                <tbody>
                    <tr><td>Genel Yetenek</td><td>${y.d}</td><td>${y.y}</td><td>${nY.toFixed(2)}</td></tr>
                    <tr><td>Genel Kültür</td><td>${k.d}</td><td>${k.y}</td><td>${nK.toFixed(2)}</td></tr>
                    <tr style="background:#222;"><td>TOPLAM</td><td>${y.d+k.d}</td><td>${y.y+k.y}</td><td>${(nY+nK).toFixed(2)}</td></tr>
                    <tr style="background:#ffff00; color:#000;"><td colspan="3"><strong>PUAN</strong></td><td><strong>${p.toFixed(2)}</strong></td></tr>
                </tbody>
            </table>
            <button class="ana-menu-karti" style="margin-top:20px;" onclick="cevapKagidiYukle()">SINAV KAĞIDINI GÖRÜNTÜLE</button>
            ${!isSinglePlayer ? `<p id="lobi-m">Sıralama bekleniyor...</p>` : `<button class="nav-buton" onclick="location.reload()">Yeni Deneme Seç</button>`}
        </div>`;
    document.getElementById('res-h').focus();
    if(!isSinglePlayer) lobiTakibi();
}

function cevapKagidiYukle() {
    const { analiz } = sonPuanVerisi;
    let z = [], g = [];
    Object.keys(analiz).forEach(kon => { if(analiz[kon].y > analiz[kon].d) z.push(kon); else if(analiz[kon].d > 0) g.push(kon); });
    document.getElementById('deneme-govde').innerHTML = `
        <div class="soru-kutusu">
            <h2 id="kag-h" tabindex="-1">Sınav Kağıdı ve Analiz</h2>
            <p><strong>Güçlü:</strong> ${g.join(', ') || "Yok"}</p>
            <p style="color:#ff0000;"><strong>Zayıf:</strong> ${z.join(', ') || "Yok"}</p>
            <hr>
            ${mevcutSorular.map((s, i) => `
                <div style="border-bottom: 1px solid #444; padding: 15px 0; text-align: left;">
                    <p><strong>Soru ${i+1}:</strong> ${kullaniciCevaplari[i] === s.dogru_cevap ? "✅ Doğru" : (kullaniciCevaplari[i] ? "❌ Yanlış" : "⚪ Boş")}</p>
                    <p>Sizin Cevabınız: ${kullaniciCevaplari[i] || "Boş"} | Doğru Cevap: ${s.dogru_cevap}</p>
                    <div style="background: #222; padding: 10px; margin-top: 10px; border-left: 4px solid #ffff00; font-size: 0.95rem;">
                        <strong>Çözüm ve Açıklama:</strong> ${s.aciklama || "Bu soru için açıklama bulunmuyor."}
                    </div>
                </div>
            `).join('')}
            <button class="nav-buton" onclick="sonucEkraniGoster()" style="margin-top:20px;">SONUÇ EKRANINA DÖN</button>
        </div>`;
    document.getElementById('kag-h').focus();
}

function lobiTakibi() {
    db.ref('odalar/' + odaKodu + '/sonuclar').on('value', snap => {
        const s = Object.values(snap.val() || {});
        if(s.length >= odaKatilimciSayisi && odaKatilimciSayisi > 0) {
            s.sort((a,b) => b.net - a.net || a.sure - b.sure || b.matD - a.matD);
            sesliBildiri("Atanan memur: " + s[0].isim);
            const m = document.getElementById('lobi-m'); if(m) m.innerHTML = `<h3 style="color:#00ff00;">Atanan: ${s[0].isim}</h3>`;
        }
    });
}

// --- 6. SÜRE VE SES ---
function baslatSayac() {
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        kalanSure--;
        const dk = Math.floor(kalanSure/60), sn = kalanSure%60;
        const dEl = document.getElementById('dakika'), sEl = document.getElementById('saniye');
        if(dEl) dEl.innerText = dk; if(sEl) sEl.innerText = sn < 10 ? '0'+sn : sn;
        if([3000, 1200, 300, 60].includes(kalanSure)) sesliBildiri(`Son ${dk} dakika.`);
        if(kalanSure <= 0) { clearInterval(timerInterval); if(!sinavBittiMi) puanHesapla(); }
    }, 1000);
}

function sesliBildiri(m) { window.speechSynthesis.cancel(); let ut = new SpeechSynthesisUtterance(m); ut.lang = 'tr-TR'; ut.rate = 1.4; window.speechSynthesis.speak(ut); }