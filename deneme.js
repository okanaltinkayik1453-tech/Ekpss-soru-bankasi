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
let isOnlyEmptyMode = false; 

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
                <label for="hedef-oyuncu-input">Toplam Katılımcı Sayısı:</label>
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
        listeHtml += `<button class="test-link" onclick="testiYukleVeBaslat('deneme${i}')">EKPSS Deneme ${i}</button>`;
    }
    listeHtml += `</div><button class="nav-buton" onclick="location.reload()">Geri Dön</button>`;
    odaYonetimi.innerHTML = listeHtml;
    document.getElementById('d-liste-baslik').focus();
}

// --- 3. ÇOKLU OYUNCU MANTIĞI ---
function odaKur() {
    const hedef = parseInt(document.getElementById('hedef-oyuncu-input').value) || 1;
    odaKodu = Math.floor(1000 + Math.random() * 9000).toString();
    db.ref('odalar/' + odaKodu).set({ durum: 'bekliyor', kurucu: auth.currentUser.displayName, oyuncuSayisi: 1, hedefOyuncu: hedef });
    db.ref('odalar/' + odaKodu).on('value', snap => {
        const d = snap.val(); if (!d) return;
        odaKatilimciSayisi = d.oyuncuSayisi;
        const btn = document.getElementById('btn-onay');
        
        // --- SESLİ BİLDİRİM MÜDAHALESİ ---
        if (odaKatilimciSayisi >= d.hedefOyuncu && btn.disabled) {
            sesliBildiri("Hedef oyuncu sayısına ulaşıldı, sınavı şimdi başlatabilirsin.");
        }

        if (odaKatilimciSayisi >= d.hedefOyuncu) {
            btn.disabled = false; btn.innerText = "SINAVI ŞİMDİ BAŞLAT"; btn.style.background = "#00ff00"; btn.style.color = "#000";
        } else {
            btn.innerText = `OYUNCULAR BEKLENİYOR (${odaKatilimciSayisi}/${d.hedefOyuncu})`;
        }
        if (d.durum === 'basladi') testiYukleVeBaslat('deneme1');
    });

    // Kendini (Kurucuyu) listeye ekle
    db.ref('odalar/' + odaKodu + '/katilimciListesi/' + auth.currentUser.uid).set(auth.currentUser.email);    
    document.getElementById('oda-islem-alani').style.display = 'block';
    document.getElementById('oda-kodu-input').value = odaKodu;
    document.getElementById('btn-onay').onclick = () => db.ref('odalar/' + odaKodu).update({ durum: 'basladi' });
    sesliBildiri("Oda kuruldu. Paylaşmanız gereken şifre " + odaKodu.split('').join(' '));
}

function odaKatilHazirlik() {
    document.getElementById('oda-islem-alani').style.display = 'block';
    document.getElementById('btn-onay').disabled = false;
    document.getElementById('btn-onay').innerText = "ODAYA GİR VE BEKLE";
    document.getElementById('btn-onay').onclick = () => {
        odaKodu = document.getElementById('oda-kodu-input').value;
        // ARKADAŞININ KAYDI BURADA YAPILIYOR
        db.ref('odalar/' + odaKodu + '/katilimciListesi/' + auth.currentUser.uid).set(auth.currentUser.email);
        
        db.ref('odalar/' + odaKodu).transaction(c => { if(c) c.oyuncuSayisi++; return c; });
        db.ref('odalar/' + odaKodu + '/durum').on('value', snap => { if(snap.val() === 'basladi') testiYukleVeBaslat('deneme1'); });
        sesliBildiri("Odaya girildi, kurucu bekleniyor.");
    };
}

// --- ULTRA AKILLI MATEMATİK BETİMLEME MOTORU (GÜNCELLENMİŞ) ---
function matematikAnlat(metin) {
    if (!metin) return;
    let anlatim = metin.toLowerCase();

    // Adım 1: Karekök ve Üslü Sayıların Temizliği
    anlatim = anlatim.replace(/sqrt\((.*?)\)/g, " karekök içerisinde $1 , karekök bitti ");
    anlatim = anlatim.replace(/√(.*?)(?=\s|$|\))/g, " karekök içerisinde $1 , karekök bitti ");
    anlatim = anlatim.replace(/\^/g, " üzeri ");
    
    // Adım 2: Kesir ve Parantez Yapısı
    anlatim = anlatim.replace(/(\(.*?\)|[0-9a-zA-Z]+)\/(\(.*?\)|[0-9a-zA-Z]+)/g, " bir kesir ifadesi: pay kısmında $1 , payda kısmında $2 . kesir bitti ");
    anlatim = anlatim.replace(/\(/g, " parantez açılıyor, ").replace(/\)/g, " , parantez kapandı ");

    // Adım 3: Temel İşaretler ve Teknik Terim Temizliği
anlatim = anlatim.replace(/\+/g, " artı ").replace(/-/g, " eksi ").replace(/\*/g, " çarpı ").replace(/\//g, " bölü ").replace(/:/g, " bölü ").replace(/=/g, " eşittir ").replace(/</g, " küçüktür ").replace(/>/g, " büyüktür ").replace(/%/g, " yüzde ");
    anlatim = anlatim.replace(/skrt|sqrt|sqr/g, "karekök");

    anlatim = anlatim.replace(/\s\s+/g, ' ').trim();

    window.speechSynthesis.cancel();
    let ut = new SpeechSynthesisUtterance(anlatim);
    ut.lang = 'tr-TR';
    ut.rate = 1.2; 
    window.speechSynthesis.speak(ut);
}

// --- 4. SINAV MOTORU VE ERİŞİLEBİLİRLİK ---
function testiYukleVeBaslat(dID, isRecover = false) {
    secilenDenemeID = dID;
    fetch(`./data/${dID}.json`).then(res => res.json()).then(data => {
        mevcutSorular = data[0].sorular;
        kullaniciCevaplari = isRecover ? JSON.parse(localStorage.getItem('cevaplar')) : new Array(mevcutSorular.length).fill(null);
        localStorage.setItem('aktifOda', odaKodu); localStorage.setItem('secilenDenemeID', dID); localStorage.setItem('kayitZamani', Date.now());
        
        odaYonetimi.style.display = 'none'; sinavEkrani.style.display = 'block';
        
        sinavEkrani.innerHTML = `
            <button id="timer-kutusu" class="timer-dikdortgen" 
                    onclick="kalanSureyiSoyle()" 
                    aria-label="Kalan süreyi belirt" 
                    style="position: fixed; top: 10px; right: 10px; background: #ff0000; color: #ffffff; padding: 25px; border: 5px solid #ffffff; border-radius: 10px; font-size: 3rem; font-weight: 900; z-index: 9999; box-shadow: 0 0 25px rgba(0,0,0,0.7);">
                <span id="dakika">100</span>:<span id="saniye">00</span>
            </button>
            <div id="deneme-govde"></div>`;
        
        const rIndex = isRecover ? (parseInt(localStorage.getItem('sonIndex')) || 0) : null;
        if(rIndex !== null) soruyuGoster(rIndex);
        else {
            document.getElementById('deneme-govde').innerHTML = `<div class="soru-kutusu"><h2 id="b-baslik" tabindex="-1">Sınav Başladı. Bölüm Seçiniz.</h2><div class="navigasyon-alani"><button class="nav-buton" onclick="soruyuGoster(0)">GENEL YETENEK</button><button class="nav-buton" onclick="soruyuGoster(30)">GENEL KÜLTÜR</button></div></div>`;
            sesliBildiri("Süreniz başladı. Lütfen çözmek istediğiniz bölümü seçin.");
            setTimeout(() => document.getElementById('b-baslik').focus(), 150);
        }
        baslatSayac(); 
    });
}

function kalanSureyiSoyle() {
    const dk = Math.floor(kalanSure / 60);
    sesliBildiri("Kalan süreniz " + dk + " dakika.");
}

function soruyuGoster(index) {
    const bolumAdi = index < 30 ? "Genel Yetenek" : "Genel Kültür";
    const ekranNo = index < 30 ? (index + 1) : (index - 29);

    if (mevcutIndex < 30 && index >= 30) {
        const dk = Math.floor(kalanSure / 60);
        sesliBildiri("Genel Kültür bölümüne geçtiniz. Kalan süreniz " + dk + " dakika.");
    } else if (mevcutIndex >= 30 && index < 30) {
        const dk = Math.floor(kalanSure / 60);
        sesliBildiri("Genel Yetenek bölümüne geçtiniz. Kalan süreniz " + dk + " dakika.");
    }

    mevcutIndex = index;
    localStorage.setItem('sonIndex', index); 
    localStorage.setItem('cevaplar', JSON.stringify(kullaniciCevaplari));
    
    const soru = mevcutSorular[index];
    let html = `
        <div class="soru-kutusu">
            <h2 id="s-no" tabindex="-1">${bolumAdi} - Soru ${ekranNo}</h2>
            ${(index >= 15 && index <= 29) ? `
                <div class="matematik-alani" style="text-align:center; margin-bottom:20px;">
                    <p class="soru-koku-vurgu" aria-hidden="true" style="font-size:1.4rem; border:2px solid #ffff00; padding:15px; background:#111;">${soru.gorselMetin || soru.soruKoku || ""}</p>
                    <button class="nav-buton" 
                            style="width:100%; background:#00ff00; color:#000; font-weight:bold; margin-bottom:10px; padding:25px; font-size:1.3rem; border:4px double #000;" 
                            onclick="matematikAnlat('${(soru.gorselMetin || soru.soruKoku || "").replace(/'/g, "\\'")}')">
                        MATEMATİK SORUSUNU KÖRCÜL DİNLE
                    </button>
                </div>
            ` : (soru.tip === "turkce" ? `
                <p class="soru-koku-vurgu">${soru.soruKoku}</p>
                <ul role="list">${soru.icerik.map((it, i) => `<li role="listitem">(${i+1}) ${it}</li>`).join('')}</ul>
            ` : `
                <p class="soru-koku-vurgu" style="margin-bottom:20px;">${soru.soruKoku || ""}</p>
            `)}
            <div class="siklar-grid">
                ${["A","B","C","D","E"].map((h, i) => `<button class="sik-butonu ${kullaniciCevaplari[index]===h?'dogru':''}" onclick="isaretle('${h}')">${h}) ${soru.secenekler[i]}</button>`).join('')}
            </div>
            <div class="navigasyon-alani">
                <button class="nav-buton" onclick="soruyuGoster(${index-1})" ${index===0?'disabled':''}>Geri</button>
                <button class="nav-buton" onclick="bosBirak()">Boş Bırak</button>
                <button class="nav-buton" onclick="sonrakiSoru()">İleri</button>
            </div>
        </div>`;
    // Liste alanını HTML içeriğine sonradan ekliyoruz
    html += `<div id="katilimci-takip" style="border-top:2px solid #444; margin-top:30px; padding:10px;">
                <p style="color:#ffff00; font-weight:bold;">Sınavdaki Oyuncular:</p>
                <ul id="canli-liste" role="list" style="list-style:none; padding:0; color:#aaa;"></ul>
             </div>`;

    document.getElementById('deneme-govde').innerHTML = html;
    
    // Listeyi canlı güncelleme motoru
    if (!isSinglePlayer) {
        db.ref('odalar/' + odaKodu + '/katilimciListesi').on('value', snap => {
            const liste = snap.val(); if(!liste) return;
            const listeHtml = Object.values(liste).map(email => `<li role="listitem">${email}</li>`).join('');
            const listeUl = document.getElementById('canli-liste');
            if(listeUl) listeUl.innerHTML = listeHtml;
        });
    }

    setTimeout(() => document.getElementById('s-no').focus(), 150);
}

function isaretle(h) { kullaniciCevaplari[mevcutIndex] = h; sesliBildiri(h + " işaretlendi."); sonrakiSoru(); }

function bosBirak() { 
    kullaniciCevaplari[mevcutIndex] = null; 
    const ekranNo = mevcutIndex < 30 ? (mevcutIndex + 1) : (mevcutIndex - 29);
    sesliBildiri(ekranNo + ". soru boş bırakıldı."); 
    sonrakiSoru(); 
}

function sonrakiSoru() {
    if (isOnlyEmptyMode) {
        const nextEmpty = kullaniciCevaplari.indexOf(null, mevcutIndex + 1);
        if (nextEmpty !== -1) soruyuGoster(nextEmpty);
        else bitisOnayEkrani();
    } else {
        if (mevcutIndex < mevcutSorular.length - 1) soruyuGoster(mevcutIndex + 1); 
        else bitisOnayEkrani();
    }
}

function bitisOnayEkrani() {
    const b = kullaniciCevaplari.filter(c => c === null).length;
    document.getElementById('deneme-govde').innerHTML = `
        <div class="soru-kutusu">
            <h2 id="bitis-h" tabindex="-1">Sınav Tamamlandı</h2>
            <p>${b > 0 ? b + " adet boşunuz var." : "Boşunuz yok."}</p>
            <div class="navigasyon-alani">
                <button class="nav-buton" onclick="bosDon()">SADECE BOŞLARA DÖN</button>
                <button class="nav-buton" onclick="puanHesapla()">PUANI HESAPLA</button>
            </div>
        </div>`;
    document.getElementById('bitis-h').focus();
}

function bosDon() { 
    const i = kullaniciCevaplari.indexOf(null); 
    if (i !== -1) { isOnlyEmptyMode = true; soruyuGoster(i); } 
    else { puanHesapla(); }
}

// --- 5. PUANLAMA VE ANALİZ ---
function puanHesapla() {
    if(sinavBittiMi) return; sinavBittiMi = true; isOnlyEmptyMode = false;
    let y = {d:0, y:0}, k = {d:0, y:0}, analiz = {};
    let matD = 0, matY = 0, digD = 0, digY = 0; 

    kullaniciCevaplari.forEach((cev, i) => {
        const s = mevcutSorular[i];
        const h = i < 30 ? y : k;
        const dMu = (cev === s.dogru_cevap);

        if (cev !== null) {
            if(dMu) h.d++; else h.y++;
            if (s.tip === "matematik") {
                if(dMu) matD++; else matY++;
            } else {
                if(dMu) digD++; else digY++;
            }
        }

        if(!analiz[s.konu]) analiz[s.konu]={d:0,y:0};
        if(dMu) analiz[s.konu].d++; else if(cev!==null) analiz[s.konu].y++;
    });
    
    const nY = y.d - (y.y / 4), nK = k.d - (k.y / 4), tN = nY + nK;
    const matNet = matD - (matY / 4);
    const digerNet = digD - (digY / 4);

    let p = 40 + digerNet;
    if (matD > 6) {
        p += (matNet * 1.2); 
    } else {
        p += matNet;
    }

    if (p > 100) p = 100;
    if (p < 0) p = 0;

    sonPuanVerisi = { y, k, nY, nK, p, analiz };

    const kullaniciIsmi = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
    db.ref('kullanicilar/' + auth.currentUser.uid + '/cozulenDenemeler/' + secilenDenemeID).set({ 
        puan: p.toFixed(2), 
        net: tN.toFixed(2), 
        tarih: Date.now() 
    });

    if (!isSinglePlayer) {
        db.ref('odalar/' + odaKodu + '/sonuclar/' + auth.currentUser.uid).set({
            isim: kullaniciIsmi,
            net: tN
        }).then(() => {
            db.ref('odalar/' + odaKodu).once('value', snap => {
                const d = snap.val();
                const sonuclar = Object.values(d.sonuclar || {});
                if (sonuclar.length >= d.hedefOyuncu) {
                    let lider = sonuclar.reduce((prev, curr) => (prev.net > curr.net) ? prev : curr);
                    sesliBildiri("Sınav sonuçlandı. Şampiyonumuz: " + lider.isim + ". Toplam neti: " + lider.net.toFixed(2));
                }
            });
        });
    }
    sonucEkraniGoster();
}

function sonucEkraniGoster() {
    const { y, k, nY, nK, p } = sonPuanVerisi;
    document.getElementById('deneme-govde').innerHTML = `
        <div class="soru-kutusu">
            <h2 id="res-h" tabindex="-1">Sınav Sonucunuz</h2>
            <table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
                <thead><tr><th>Bölüm</th><th>Doğru</th><th>Yanlış</th><th>Net</th></tr></thead>
                <tbody>
                    <tr><td>Genel Yetenek</td><td>${y.d}</td><td>${y.y}</td><td>${nY.toFixed(2)}</td></tr>
                    <tr><td>Genel Kültür</td><td>${k.d}</td><td>${k.y}</td><td>${nK.toFixed(2)}</td></tr>
                    <tr style="background:#222;"><td>TOPLAM NET</td><td colspan="3"><strong>${(nY+nK).toFixed(2)} Net</strong></td></tr>
                    <tr style="background:#ffff00; color:#000;"><td colspan="3"><strong>100 ÜZERİNDEN PUANINIZ</strong></td><td><strong>${p.toFixed(2)}</strong></td></tr>
                </tbody>
            </table>
            <button class="ana-menu-karti" style="margin-top:20px;" onclick="cevapKagidiYukle()">SINAV KAĞIDINI VE ANALİZİ GÖRÜNTÜLE</button>
            <button class="nav-buton" onclick="location.reload()">Yeni Deneme Seç</button>
        </div>`;
    document.getElementById('res-h').focus();
}

function cevapKagidiYukle() {
    const { analiz } = sonPuanVerisi;
    let zayifListe = "", gucluListe = "";
    Object.keys(analiz).forEach(kon => {
        if(analiz[kon].y > analiz[kon].d) zayifListe += `<li>${kon} konusunda zayıfsınız.</li>`;
        else if(analiz[kon].d > 0) gucluListe += `<li>${kon} konusunda güçlüsünüz.</li>`;
    });

    document.getElementById('deneme-govde').innerHTML = `
        <div class="soru-kutusu">
            <h2 id="kag-h" tabindex="-1">Sınav Kağıdı, Sorular ve Detaylı Çözümler</h2>
            
            <div style="margin-bottom:25px; border:2px solid #fff; padding:15px; background:#1a1a1a;">
                <h3 style="color:#00ff00;">GÜÇLÜ KONULARINIZ:</h3>
                <ul style="padding-left:20px;">${gucluListe || "Henüz tespit edilemedi."}</ul>
                <h3 style="color:#ff0000; margin-top:15px;">ZAYIF KONULARINIZ:</h3>
                <ul style="padding-left:20px;">${zayifListe || "Henüz tespit edilemedi."}</ul>
            </div>
            
            <hr style="border: 1px solid #444;">
            
            ${mevcutSorular.map((s, i) => {
                const kullaniciSecimi = kullaniciCevaplari[i];
                const dogruMu = kullaniciSecimi === s.dogru_cevap;
                const durumMetni = dogruMu ? "✅ Doğru" : (kullaniciSecimi ? "❌ Yanlış" : "⚪ Boş");
                const bolum = i < 30 ? "Genel Yetenek" : "Genel Kültür";
                const no = i < 30 ? (i + 1) : (i - 29);
                
                return `
                <div style="border-bottom: 3px solid #444; padding: 25px 0; text-align: left;">
                    <p style="font-size: 1.2rem; background: #222; padding: 5px;"><strong>${bolum} - Soru ${no}:</strong> ${durumMetni}</p>
                    
                    <div style="margin: 15px 0; padding: 10px; border-left: 4px solid #007bff;">
                        <p><strong>Soru Metni:</strong></p>
                        <p>${s.soruKoku || ""}</p>
                        ${s.icerik ? `<ul style="list-style-type: none; padding-left: 0;">${s.icerik.map((it, idx) => `<li>(${idx+1}) ${it}</li>`).join('')}</ul>` : ""}
                    </div>

                    <div style="margin-left: 15px; margin-bottom: 15px;">
                        ${["A","B","C","D","E"].map((h, idx) => {
                            let stil = "margin: 5px 0; padding: 3px;";
                            let ekBilgi = "";
                            if (h === s.dogru_cevap) {
                                stil += "background: rgba(0, 255, 0, 0.2); border: 1px solid #00ff00; font-weight: bold;";
                                ekBilgi = " (DOĞRU CEVAP)";
                            } else if (h === kullaniciSecimi) {
                                stil += "background: rgba(255, 0, 0, 0.2); border: 1px solid #ff0000;";
                                ekBilgi = " (SİZİN CEVABINIZ)";
                            }
                            return `<p style="${stil}">${h}) ${s.secenekler[idx]} ${ekBilgi}</p>`;
                        }).join('')}
                    </div>

                    <div style="background: #1e1e1e; padding: 15px; border: 1px dashed #ffff00; border-radius: 8px;">
                        <p style="color: #ffff00; font-weight: bold; margin-bottom: 5px;">AÇIKLAMALI ÇÖZÜM:</p>
                        <p>${s.aciklama}</p>
                    </div>
                </div>`;
            }).join('')}
            
            <button class="nav-buton" onclick="sonucEkraniGoster()" style="margin-top:30px; width: 100%; height: 60px; font-size: 1.5rem;">SONUÇ EKRANINA DÖN</button>
        </div>`;
    document.getElementById('kag-h').focus();
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