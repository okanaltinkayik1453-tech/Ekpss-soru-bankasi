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

// --- AYARLAR VE DEĞİŞKENLER ---
const TOPLAM_DENEME_SAYISI = 1; 
let mevcutSorular = [], mevcutIndex = 0, kullaniciCevaplari = [];
let kalanSure = 100 * 60, timerInterval, odaKodu = "";
let isSinglePlayer = false, secilenDenemeID = "", odaKatilimciSayisi = 0;
let sonPuanVerisi = null, sinavBittiMi = false;
let isOnlyEmptyMode = false, sampiyonDuyuruldu = false;
let secilenHedef = 1;

// --- BAĞLANTI KURTARMA (RECONNECTION) ---
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const kaydedilmisOda = localStorage.getItem('aktifOda');
        const kayitZamani = localStorage.getItem('kayitZamani');
        const kaydedilmisMod = localStorage.getItem('isSinglePlayer');

        if (kaydedilmisOda && (Date.now() - parseInt(kayitZamani) < 7200000)) {
            sesliBildiri("Sınava kaldığınız yerden devam ediyorsunuz.");
            odaKodu = kaydedilmisOda;
            isSinglePlayer = kaydedilmisMod === 'true';
            secilenDenemeID = localStorage.getItem('secilenDenemeID');
            testiYukleVeBaslat(secilenDenemeID, true);
        } else {
            girisEkrani.style.display = 'none';
            odaYonetimi.style.display = 'block';
            anaMenuGoster(user.displayName);
        }
    } else {
        girisEkrani.style.display = 'block';
        odaYonetimi.style.display = 'none';
    }
});

// --- GİRİŞ VE ANA MENÜ ---
const btnLogin = document.getElementById('btn-google-login');
const girisEkrani = document.getElementById('giris-ekrani');
const odaYonetimi = document.getElementById('oda-yonetimi');
const sinavEkrani = document.getElementById('sinav-ekrani');

if(btnLogin) {
    btnLogin.onclick = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).then((res) => {
            girisEkrani.style.display = 'none';
            odaYonetimi.style.display = 'block';
            anaMenuGoster(res.user.displayName);
        });
    };
}
function anaMenuGoster(isim) {
    odaYonetimi.innerHTML = `
        <h2 id="menu-baslik" tabindex="-1">Hoş geldin, ${isim}</h2>
        <div class="sol-sutun-butonlari">
            <div style="margin-bottom:15px; border:1px solid #444; padding:15px; background:#1a1a1a;">
                <label for="hedef-oyuncu-input">Toplam Katılımcı Sayısı:</label>
                <input type="number" id="hedef-oyuncu-input" value="1" min="1" max="100" style="width:100%; padding:10px; margin-top:5px; background:#000; color:#fff; border:1px solid #ffff00;">
                <button class="ana-menu-karti" onclick="denemeListesiGoster(false)" style="margin-top:10px;">ÇOKLU SINAV KUR (ODA SAHİBİ)</button>
            </div>
            <button class="ana-menu-karti" onclick="odaKatilHazirlik()">ÇOKLU SINAVA GİR (KOD İLE)</button>
            <button class="ana-menu-karti" onclick="denemeListesiGoster(true)" style="background:#ffff00; color:#000;">TEK KİŞİLİK SINAV BAŞLAT</button>
        </div>`;
    document.getElementById('menu-baslik').focus();
}

function denemeListesiGoster(tekliMi) {
    isSinglePlayer = tekliMi;
    if(!tekliMi) secilenHedef = parseInt(document.getElementById('hedef-oyuncu-input').value) || 1;
    let listeHtml = `<h2 id="d-liste-baslik" tabindex="-1">Lütfen Bir Deneme Seçiniz</h2><div class="sol-sutun-butonlari">`;
    for (let i = 1; i <= TOPLAM_DENEME_SAYISI; i++) {
        const dID = `deneme${i}`;
        listeHtml += `<button class="test-link" onclick="${tekliMi ? `testiYukleVeBaslat('${dID}')` : `odaKurHazirlik('${dID}')`}">EKPSS Deneme ${i}</button>`;
    }
    listeHtml += `</div><button class="nav-buton" onclick="location.reload()">Geri Dön</button>`;
    odaYonetimi.innerHTML = listeHtml;
    document.getElementById('d-liste-baslik').focus();
}

// --- ÇOKLU OYUNCU MANTIĞI ---
function odaKurHazirlik(dID) {
    secilenDenemeID = dID;
    const hedef = secilenHedef;
    odaKodu = Math.floor(1000 + Math.random() * 9000).toString();
    db.ref('odalar/' + odaKodu).set({ durum: 'bekliyor', kurucu: auth.currentUser.displayName, oyuncuSayisi: 1, hedefOyuncu: hedef, denemeID: dID });
    
    db.ref('odalar/' + odaKodu).on('value', snap => {
        const d = snap.val(); if (!d) return;
odaKatilimciSayisi = d.katilimciListesi ? Object.keys(d.katilimciListesi).length : 1;
        const btn = document.getElementById('btn-onay');
        
        if (odaKatilimciSayisi >= d.hedefOyuncu && btn && btn.disabled) {
            sesliBildiri("Hedef oyuncu sayısına ulaşıldı, sınavı şimdi başlatabilirsin.");
            btn.disabled = false; btn.innerText = "SINAVI ŞİMDİ BAŞLAT"; btn.style.background = "#00ff00"; btn.style.color = "#000";
        } else if (btn) {
            btn.innerText = `OYUNCULAR BEKLENİYOR (${odaKatilimciSayisi}/${d.hedefOyuncu})`;
        }
        
        if (d.durum === 'basladi' && sinavEkrani.style.display !== 'block') {
            db.ref('odalar/' + odaKodu).off();
            testiYukleVeBaslat(d.denemeID);
        }
    });

const pRef = db.ref('odalar/' + odaKodu + '/katilimciListesi/' + auth.currentUser.uid);
    pRef.set(auth.currentUser.email);
    pRef.onDisconnect().remove();
    odaYonetimi.innerHTML = `
        <h2 id="oda-kur-baslik" tabindex="-1">Oda Kuruldu. Kod: ${odaKodu}</h2>
        <div id="oda-islem-alani">
            <button id="btn-onay" class="nav-buton" style="width:100%;" disabled>OYUNCULAR BEKLENİYOR...</button>
        </div>`;
    document.getElementById('btn-onay').onclick = () => db.ref('odalar/' + odaKodu).update({ durum: 'basladi' });
    sesliBildiri("Oda kuruldu. Paylaşmanız gereken şifre " + odaKodu.split('').join(' '));
    document.getElementById('oda-kur-baslik').focus();
}

function odaKatilHazirlik() {
    odaYonetimi.innerHTML = `
        <h2 id="katil-baslik" tabindex="-1">Odaya Katıl</h2>
        <input type="number" id="oda-kodu-input" placeholder="4 Haneli Şifre" style="width:100%; padding:15px; font-size:1.5rem; background:#000; color:#fff; border:1px solid #ffff00;">
        <button id="btn-katil-onay" class="nav-buton" style="width:100%; margin-top:10px;">ODAYA GİR VE BEKLE</button>
        <button class="nav-buton" onclick="location.reload()" style="margin-top:10px;">GERİ</button>`;
    
    document.getElementById('katil-baslik').focus();

    document.getElementById('btn-katil-onay').onclick = () => {
        odaKodu = document.getElementById('oda-kodu-input').value;
        const odaRef = db.ref('odalar/' + odaKodu);
        
        odaRef.once('value').then(snap => {
            if(!snap.exists()) {
                sesliBildiri("Hatalı oda kodu girdiniz.");
                return;
            }
const pRef = db.ref('odalar/' + odaKodu + '/katilimciListesi/' + auth.currentUser.uid);
    pRef.set(auth.currentUser.email);
    pRef.onDisconnect().remove();
            odaRef.on('value', (s) => {
                if (s.val() && s.val().durum === 'basladi') {
                    odaRef.off();
                    testiYukleVeBaslat(s.val().denemeID);
                }
            });
            sesliBildiri("Odaya girildi, kurucu bekleniyor.");
        });
    };
}

// --- MATEMATİK BETİMLEME MOTORU ---
function matematikAnlat(konu, metin, hazirBetimleme) {
    if (!metin && !hazirBetimleme) return;
    if (hazirBetimleme && hazirBetimleme.trim() !== "") {
        sesliBildiri("Konu: " + konu + ". " + hazirBetimleme);
        return;
    }
    let anlatim = metin.toLowerCase();
    let giris = "Bu bir " + konu + " sorusudur. Denklem şöyle: ";
    anlatim = anlatim.replace(/sqrt\((.*?)\)/g, " karekök içerisinde $1 , karekök bitti ");
    anlatim = anlatim.replace(/√(.*?)(?=\s|$|\))/g, " karekök içerisinde $1 , karekök bitti ");
    anlatim = anlatim.replace(/\^/g, " üzeri ");
    anlatim = anlatim.replace(/(\(.*?\)|[0-9a-zA-Z]+)\/(\(.*?\)|[0-9a-zA-Z]+)/g, " bir kesir ifadesi: pay kısmında $1 , payda kısmında $2 . kesir bitti ");
    anlatim = anlatim.replace(/\(/g, " parantez açılıyor, ").replace(/\)/g, " , parantez kapandı ");
    anlatim = anlatim.replace(/([0-9])([a-z])/g, "$1 çarpı $2"); 
    anlatim = anlatim.replace(/\+/g, " artı ").replace(/-/g, " eksi ").replace(/\*/g, " çarpı ").replace(/\//g, " bölü ").replace(/:/g, " bölü ").replace(/=/g, " , eşittir , ").replace(/</g, " , küçüktür , ").replace(/>/g, " , büyüktür , ").replace(/%/g, " yüzde ").replace(/\?/g, " , nedir , ");
    anlatim = anlatim.replace(/\s\s+/g, ' ').trim();
    sesliBildiri(giris + anlatim);
}

// --- SINAV MOTORU ---
function testiYukleVeBaslat(dID, isRecover = false) {
sesliBildiri(" "); // Tarayıcının ses motorunu boş bir fısıltıyla uyandırıyoruz.
    secilenDenemeID = dID;
    sinavBittiMi = false;
    fetch(`./data/${dID}.json`).then(res => res.json()).then(data => {
        mevcutSorular = data[0].sorular;
        kullaniciCevaplari = isRecover ? JSON.parse(localStorage.getItem('cevaplar')) : new Array(mevcutSorular.length).fill(null);
        localStorage.setItem('aktifOda', odaKodu); 
        localStorage.setItem('secilenDenemeID', dID); 
        localStorage.setItem('kayitZamani', Date.now());
        localStorage.setItem('isSinglePlayer', isSinglePlayer);        
        
        odaYonetimi.style.display = 'none'; 
        sinavEkrani.style.display = 'block';
        
        sinavEkrani.innerHTML = `
            <button id="timer-kutusu" class="timer-dikdortgen" onclick="kalanSureyiSoyle()" aria-label="Kalan süreyi belirt">
                <span id="dakika">100</span>:<span id="saniye">00</span>
            </button>
            <div id="deneme-govde"></div>
            <div id="katilimci-takip" style="border-top:2px solid #444; margin-top:30px; padding:10px;">
                <p style="color:#ffff00; font-weight:bold;">Sınavdaki Oyuncular:</p>
                <ul id="canli-liste" role="list" style="list-style:none; padding:0; color:#aaa;"></ul>
            </div>`;

        if (!isSinglePlayer) {
// 2. ŞAMPİYON DİNLEYİCİ: Veritabanında şampiyon ilanı çıktığı an herkes duyar
db.ref('odalar/' + odaKodu + '/sampiyon_ilani').on('value', sSnap => {
    const s = sSnap.val();
    if (s && !sampiyonDuyuruldu) {
        sampiyonDuyuruldu = true;
        sesliBildiri("Dikkat! Sınav bitti. Şampiyon: " + s.isim + ". Net: " + s.net);
    }
});

            db.ref('odalar/' + odaKodu + '/katilimciListesi').on('value', snap => {
                const liste = snap.val(); if(!liste) return;
                const listeHtml = Object.values(liste).map(email => `<li role="listitem">${email}</li>`).join('');
                if(document.getElementById('canli-liste')) document.getElementById('canli-liste').innerHTML = listeHtml;
            });
// 1. ŞAMPİYON YAZICI: Herkes bittiğinde lideri belirleyip odaya yazar
        db.ref('odalar/' + odaKodu + '/sonuclar').on('value', snap => {
            const sonuclar = snap.val(); if(!sonuclar) return;
            db.ref('odalar/' + odaKodu + '/katilimciListesi').once('value', hSnap => {
                const aktifSayi = hSnap.val() ? Object.keys(hSnap.val()).length : 1;
                if (Object.values(sonuclar).length >= aktifSayi) {
                    let lider = Object.values(sonuclar).reduce((prev, curr) => (prev.net > curr.net) ? prev : curr);
                    db.ref('odalar/' + odaKodu + '/sampiyon_ilani').set({ isim: lider.isim, net: lider.net.toFixed(2) });
                }
            });
        });
        const rIndex = isRecover ? (parseInt(localStorage.getItem('sonIndex')) || 0) : null;
        if(rIndex !== null) soruyuGoster(rIndex);
        else {
            document.getElementById('deneme-govde').innerHTML = `
                <div class="soru-kutusu">
                    <h2 id="b-baslik" tabindex="-1">Sınav Başladı. Bölüm Seçiniz.</h2>
                    <div class="navigasyon-alani">
                        <button class="nav-buton" onclick="soruyuGoster(0)">GENEL YETENEK</button>
                        <button class="nav-buton" onclick="soruyuGoster(30)">GENEL KÜLTÜR</button>
                    </div>
                </div>`;
            sesliBildiri("Süreniz başladı. Lütfen çözmek istediğiniz bölümü seçin.");
            setTimeout(() => document.getElementById('b-baslik').focus(), 150);
        }
        baslatSayac(); 
    });
}

function soruyuGoster(index) {
    const bolumAdi = index < 30 ? "Genel Yetenek" : "Genel Kültür";
    const ekranNo = index < 30 ? (index + 1) : (index - 29);

    if (mevcutIndex < 30 && index >= 30) sesliBildiri("Genel Kültür bölümüne geçtiniz.");
    else if (mevcutIndex >= 30 && index < 30) sesliBildiri("Genel Yetenek bölümüne geçtiniz.");

    mevcutIndex = index;
    localStorage.setItem('sonIndex', index); 
    localStorage.setItem('cevaplar', JSON.stringify(kullaniciCevaplari));
    
    const soru = mevcutSorular[index];
    let html = `
        <div class="soru-kutusu">
            <h2 id="s-no" tabindex="-1">${bolumAdi} - Soru ${ekranNo}</h2>`;

    // MATEMATİK SORULARI (15-29 ARASI)
    if (index >= 15 && index <= 29) {
        html += `
            <div class="matematik-alani" role="region" aria-label="Matematik Sorusu Yardımcı Araçları">
                <div id="mat-gorsel-alan" aria-hidden="true">
                    <p class="soru-koku-vurgu" style="background: #1a1a1a; padding: 15px; border-radius: 8px; text-align: justify;">
                        ${soru.gorselMetin || soru.soruKoku}
                    </p>
                </div>
                <div id="mat-metin-alan" style="display:none;" role="alert" aria-live="assertive">
                    <p class="soru-koku-vurgu" style="color: #ffff00; background: #000; padding: 15px; border: 2px solid #ffff00; text-align: justify;">
                        ${soru.sesliBetimleme}
                    </p>
                </div>
                <div class="navigasyon-alani" style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button class="nav-buton" id="btn-metne-donustur" style="flex: 1; background: #ffff00; color: #000;" 
                            onclick="document.getElementById('mat-gorsel-alan').style.display='none'; 
                                     document.getElementById('mat-metin-alan').style.display='block';
                                     this.style.display='none'; 
                                     document.getElementById('btn-gorsele-don').style.display='block';
                                     sesliBildiri('Formül gizlendi, körcül metin açıldı.');">
                        METNE DÖNÜŞTÜR
                    </button>
                    <button class="nav-buton" id="btn-gorsele-don" style="flex: 1; background: #ffffff; color: #000; display: none;" 
                            onclick="document.getElementById('mat-gorsel-alan').style.display='block'; 
                                     document.getElementById('mat-metin-alan').style.display='none';
                                     this.style.display='none'; 
                                     document.getElementById('btn-metne-donustur').style.display='block';
                                     sesliBildiri('Metin gizlendi, görsel görünüme dönüldü.');">
                        GÖRSELE DÖN
                    </button>
                </div>
                <button class="nav-buton" style="width:100%; background:#00ff00; color:#000; padding:25px; font-weight: bold;" 
                        onclick="matematikAnlat('${soru.konu}', '', '${soru.sesliBetimleme.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')">
                    KÖRCÜL DİNLE (SESLİ)
                </button>
            </div>`;
} else {
        // TÜRKÇE, TARİH, COĞRAFYA VB. (AKILLI VE KÖRCÜL DOSTU MOD)
        html += `<p class="soru-koku-vurgu" style="text-align: justify; margin-bottom:10px;">${soru.soruKoku}</p>`;

        if (soru.icerik) {
            let icerikDizisi = [];

            // JSON'dan gelen verinin tipine göre (Dizi veya Düz Metin) içeriği hazırla
            if (Array.isArray(soru.icerik) && soru.icerik.length > 0) {
                icerikDizisi = soru.icerik;
            } 
            else if (typeof soru.icerik === 'string' && soru.icerik.trim() !== "") {
                // Eğer metin içinde 1. 2. gibi numaralar varsa, bunları kullanarak metni parçala
                if (/\d+[\.\)]/.test(soru.icerik)) {
                    icerikDizisi = soru.icerik.split(/\s*\d+[\.\)]\s*/).filter(item => item.trim() !== "");
                } else {
                    html += `<p style="text-align: justify; margin-top:10px;">${soru.icerik}</p>`;
                }
            }

            // Listeyi oluştururken çift okumayı engellemek için temizlik yap
            if (icerikDizisi.length > 0) {
                html += `<ul role="list" aria-label="Soru metni parçaları" style="list-style: none; padding: 0; text-align: justify; margin-top:10px;">
                    ${icerikDizisi.map((it, i) => {
                        // Cümle başındaki "1.", "1)", "(1)" gibi mevcut numaraları siler
                        const temizMetin = it.replace(/^[\(\d\.\)]+\s*/, "").trim();
                        return `
                        <li role="listitem" tabindex="-1" style="margin-bottom: 12px; line-height: 1.6;">
                            <strong>(${i+1})</strong> ${temizMetin}
                        </li>`;
                    }).join('')}
                </ul>`;
            }
        }
    }
    // ŞIKLAR VE NAVİGASYON (Ortak Alan)
    html += `
            <div class="siklar-grid" role="group" aria-label="Seçenekler">
                ${["A","B","C","D","E"].map((h, i) => `
                    <button class="sik-butonu ${kullaniciCevaplari[index]===h?'dogru':''}" 
                        onclick="isaretle('${h}')">
                        ${h}) ${soru.secenekler[i]}
                    </button>`).join('')}
            </div>
            <div class="navigasyon-alani">
                <button class="nav-buton" onclick="soruyuGoster(${index-1})" ${index===0?'disabled':''}>Geri</button>
                <button class="nav-buton" onclick="bosBirak()">Boş Bırak</button>
                <button class="nav-buton" onclick="sonrakiSoru()">İleri</button>
            </div>
        </div>`;

    document.getElementById('deneme-govde').innerHTML = html;

    // KÖRCÜL ODAKLANMA: Sadece soru numarasını oku ve dur
    setTimeout(() => { 
        const t = document.getElementById('s-no'); 
        if(t) {
            t.focus(); 
            window.scrollTo(0, 0); 
        }
    }, 150);
}

// --- AKILLI NAVİGASYON ---
function sonrakiSoru() {
    const toplamSoru = mevcutSorular.length;

    if (isOnlyEmptyMode) {
        let sonrakiBosIndex = -1;
        for (let i = mevcutIndex + 1; i < toplamSoru; i++) {
            if (kullaniciCevaplari[i] === null) {
                sonrakiBosIndex = i;
                break;
            }
        }

        if (sonrakiBosIndex !== -1) {
            if (mevcutIndex < 30 && sonrakiBosIndex >= 30) {
                sesliBildiri("Genel Yetenek boşları bitti. Genel Kültür boşlarına geçiliyor.");
            }
            soruyuGoster(sonrakiBosIndex);
        } else {
            isOnlyEmptyMode = false;
            finalBitisEkrani();
        }
        return;
    }

    if (mevcutIndex === 29) {
        const gkHiçDokunulmadi = kullaniciCevaplari.slice(30, 60).every(c => c === null);
        if (gkHiçDokunulmadi) {
            sesliBildiri("Genel Yetenek bitti. Genel Kültür bölümüne geçiliyor.");
            soruyuGoster(30);
        } else {
            bitisOnayEkrani();
        }
    } else if (mevcutIndex === 59) {
        const gyHiçDokunulmadi = kullaniciCevaplari.slice(0, 30).every(c => c === null);
        if (gyHiçDokunulmadi) {
            sesliBildiri("Genel Kültür bitti. Genel Yetenek bölümüne geçiliyor.");
            soruyuGoster(0);
        } else {
            bitisOnayEkrani();
        }
    } else {
        soruyuGoster(mevcutIndex + 1);
    }
}

function isaretle(h) { 
    kullaniciCevaplari[mevcutIndex] = h; 
    sesliBildiri(h + " işaretlendi."); 
    sonrakiSoru(); 
}

function bosBirak() { 
    kullaniciCevaplari[mevcutIndex] = null; 
    sesliBildiri("Boş bırakıldı."); 
    sonrakiSoru(); 
}

function bitisOnayEkrani() {
    const bosSayisi = kullaniciCevaplari.filter(c => c === null).length;
    let icerikHtml = "";
    
    if (bosSayisi > 0) {
        icerikHtml = `
            <h2 id="bitis-h" tabindex="-1">Tüm Soruları Gördünüz</h2>
            <p style="font-size:1.5rem; margin-bottom:20px;">Toplam ${bosSayisi} boş bıraktığınız soru var.</p>
            <div class="navigasyon-alani" style="display:flex; flex-direction:column; gap:15px;">
                <button class="nav-buton" onclick="bosDon()" style="background:#ffff00; color:#000; padding:20px; font-weight:bold;">BOŞ BIRAKTIĞIM SORULARA DÖN</button>
                <button class="nav-buton" style="background:#00ff00; color:#000; padding:20px;" onclick="puanHesapla()">SINAVI TAMAMEN BİTİR</button>
            </div>`;
        sesliBildiri("Sınavı tamamladınız. " + bosSayisi + " adet boşunuz var.");
    } else {
        icerikHtml = `
            <h2 id="bitis-h" tabindex="-1">Sınav Tamamlandı</h2>
            <p style="font-size:1.5rem; margin-bottom:20px;">Tüm soruları yanıtladınız.</p>
            <div class="navigasyon-alani">
                <button class="nav-buton" style="width:100%; background:#00ff00; color:#000;" onclick="puanHesapla()">SINAVI BİTİR VE PUANI HESAPLA</button>
            </div>`;
        sesliBildiri("Tüm soruları yanıtladınız. Sınavı bitirebilirsiniz.");
    }

    document.getElementById('deneme-govde').innerHTML = `<div class="soru-kutusu">${icerikHtml}</div>`;
    setTimeout(() => document.getElementById('bitis-h').focus(), 150);
}

function bosDon() { 
    const ilkBos = kullaniciCevaplari.indexOf(null); 
    if (ilkBos !== -1) { 
        isOnlyEmptyMode = true; 
        sesliBildiri("Boş sorularınıza dönülüyor.");
        soruyuGoster(ilkBos); 
    } else {
        puanHesapla();
    }
}

function finalBitisEkrani() {
    const icerikHtml = `
        <h2 id="final-h" tabindex="-1">Boşlar Tamamlandı</h2>
        <div class="navigasyon-alani">
            <button class="nav-buton" style="width:100%; background:#00ff00; color:#000; padding:20px; font-weight:bold;" onclick="puanHesapla()">SINAVI BİTİR VE SONUCU GÖR</button>
        </div>`;
    sesliBildiri("Boş sorularınız bitti. Sınavı bitirebilirsiniz.");
    document.getElementById('deneme-govde').innerHTML = `<div class="soru-kutusu">${icerikHtml}</div>`;
    setTimeout(() => document.getElementById('final-h').focus(), 150);
}

// --- PUANLAMA VE ANALİZ ---
function puanHesapla() {
    if(sinavBittiMi) return; sinavBittiMi = true; isOnlyEmptyMode = false;
    let yD=0, yY=0, kD=0, kY=0, analiz={}, matD=0, matY=0;

    kullaniciCevaplari.forEach((cev, i) => {
        const s = mevcutSorular[i], dMu = (cev === s.dogru_cevap);
        if (i < 30) { if(cev!==null) { if(dMu) yD++; else yY++; } }
        else { if(cev!==null) { if(dMu) kD++; else kY++; } }
        if (i >= 15 && i <= 29 && cev !== null) { if(dMu) matD++; else matY++; }
        if(!analiz[s.konu]) analiz[s.konu]={d:0,y:0};
        if(dMu) analiz[s.konu].d++; else if(cev!==null) analiz[s.konu].y++;
    });
    
    const matNet = matD - (matY / 4);
    const toplamYanlis = yY + kY;
    const toplamNet = (yD + kD) - (toplamYanlis / 4);
    let p = 40; 
    if (matNet >= 6) {
        const digerNetler = toplamNet - matNet;
        p += (matNet * 1.2) + digerNetler;
    } else {
        p += toplamNet;
    }
    if (toplamYanlis > 0 && p >= 100) { p = 99.75; }
    if (p > 100) p = 100;
    if (p < 0) p = 0;
    
    sonPuanVerisi = { yD, yY, kD, kY, n: toplamNet, p: p, analiz };
    const isim = auth.currentUser.displayName || "Aday";
    db.ref('kullanicilar/' + auth.currentUser.uid + '/cozulenDenemeler/' + secilenDenemeID).set({ puan: p.toFixed(2), net: toplamNet.toFixed(2), tarih: Date.now() });

    if (!isSinglePlayer) db.ref('odalar/' + odaKodu + '/sonuclar/' + auth.currentUser.uid).set({ isim, net: toplamNet });
    sonucEkraniGoster();
}

function sonucEkraniGoster() {
    const { yD, yY, kD, kY, n, p } = sonPuanVerisi;
    const yNet = (yD - (yY / 4)).toFixed(2);
    const kNet = (kD - (kY / 4)).toFixed(2);

    document.getElementById('deneme-govde').innerHTML = `
        <div class="soru-kutusu">
            <h2 id="res-h" tabindex="-1">Sınav Sonucunuz</h2>
            <table style="width:100%; border-collapse: collapse; background: #8B0000; color: white; border: 4px solid white; margin-bottom: 20px;">
                <thead>
                    <tr style="border-bottom: 3px solid white;">
                        <th style="padding: 10px; border-right: 2px solid white;">Bölüm</th>
                        <th style="padding: 10px; border-right: 2px solid white;">D</th>
                        <th style="padding: 10px; border-right: 2px solid white;">Y</th>
                        <th style="padding: 10px;">Net</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 2px solid white; font-weight: bold;">
                        <td style="padding: 15px; border-right: 2px solid white;">Genel Yetenek</td>
                        <td style="padding: 15px; border-right: 2px solid white;">${yD}</td>
                        <td style="padding: 15px; border-right: 2px solid white;">${yY}</td>
                        <td style="padding: 15px;">${yNet}</td>
                    </tr>
                    <tr style="border-bottom: 3px solid white; font-weight: bold;">
                        <td style="padding: 15px; border-right: 2px solid white;">Genel Kültür</td>
                        <td style="padding: 15px; border-right: 2px solid white;">${kD}</td>
                        <td style="padding: 15px; border-right: 2px solid white;">${kY}</td>
                        <td style="padding: 15px;">${kNet}</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="padding: 20px; text-align: center; font-size: 1.8rem; background: #fff; color: #8B0000;">
                            <strong>TOPLAM PUAN: ${p.toFixed(2)}</strong>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="navigasyon-alani">
                <button class="ana-menu-karti" onclick="cevapKagidiYukle()">DETAYLI ANALİZ VE ÇÖZÜMLER</button>
                <button class="nav-buton" style="background: #ffff00; color: #000;" onclick="sinaviTemizleVeListeyeDon()">YENİ DENEME SEÇ</button>
            </div>
        </div>`;
    document.getElementById('res-h').focus();
    sesliBildiri("Sınav bitti. Puanınız " + p.toFixed(2));
}

function cevapKagidiYukle() {
    let listHtml = `<h2 id="kag-h" tabindex="-1">Detaylı Çözümler</h2><div style="text-align:left; max-height:500px; overflow-y:auto; padding:10px;">`;
    mevcutSorular.forEach((s, i) => {
        const c = kullaniciCevaplari[i];
        const durum = c === s.dogru_cevap ? "DOĞRU" : (c === null ? "BOŞ" : "YANLIŞ");
        listHtml += `
            <div style="border-bottom:2px solid #444; margin-bottom:15px; padding:10px;">
                <h3 style="color:#ffff00;">Soru ${i+1} (${durum})</h3>
                <p><strong>Soru:</strong> ${s.soruKoku || "Matematik/Görsel"}</p>
                <p>Cevabınız: ${c || "İşaretlenmedi"} | Doğru: ${s.dogru_cevap}</p>
                <p style="background:#1a1a1a; padding:10px; border-left:4px solid #00ff00; margin-top:5px;">
                    <strong>Açıklama:</strong> ${s.aciklama || "Ek açıklama bulunmuyor."}
                </p>
            </div>`;
    });
    listHtml += `</div><button class="nav-buton" onclick="sonucEkraniGoster()">Geri Dön</button>`;
    document.getElementById('deneme-govde').innerHTML = listHtml;
    document.getElementById('kag-h').focus();
}

// --- YARDIMCI FONKSİYONLAR ---
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

function kalanSureyiSoyle() { sesliBildiri("Kalan süreniz " + Math.floor(kalanSure / 60) + " dakika."); }
function sesliBildiri(m) { 
    if (!m || m.trim() === "") {
        // Boş mesaj gelirse sadece motoru tetikle ama konuşma
        const bosUt = new SpeechSynthesisUtterance("");
        window.speechSynthesis.speak(bosUt);
        return;
    }

    window.speechSynthesis.cancel(); 
    let ut = new SpeechSynthesisUtterance(m); 
    ut.lang = 'tr-TR'; 
    ut.rate = 1.3; // Mobilde daha net anlaşılması için hafif yavaşlatıldı
    ut.pitch = 1.0;
    window.speechSynthesis.speak(ut); 
}
function sinaviTemizleVeListeyeDon() {
    if (odaKodu) {
        db.ref('odalar/' + odaKodu).off();
        db.ref('odalar/' + odaKodu + '/katilimciListesi').off();
        db.ref('odalar/' + odaKodu + '/sonuclar').off();
    }
    if(timerInterval) clearInterval(timerInterval);
    sinavBittiMi = false; isOnlyEmptyMode = false; sampiyonDuyuruldu = false; 
    mevcutIndex = 0; kullaniciCevaplari = []; kalanSure = 100 * 60;

    localStorage.removeItem('aktifOda');
    localStorage.removeItem('cevaplar');
    localStorage.removeItem('sonIndex');
    localStorage.removeItem('kayitZamani');
    localStorage.removeItem('isSinglePlayer');
    localStorage.removeItem('secilenDenemeID');

    sinavEkrani.style.display = 'none';
sinavEkrani.innerHTML = '';
    odaYonetimi.innerHTML = '';
    document.getElementById('deneme-govde').innerHTML = '';
    odaYonetimi.style.display = 'block';
    const user = firebase.auth().currentUser;
    if(user) anaMenuGoster(user.displayName);
}