// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;

// JSON DOSYALARININ YOLU
const JSON_PATH = './data/';

// JSON Dosya Adı Eşleştirme Haritası (KORUNMUŞTUR)
const DOSYA_ESLESTIRME = {
    "ilkturkislam": "ilkturkislamdevletleri.json",
    "islamoncesi": "islamoncesiturkdevletleri.json",
    "osmanlikultur": "osmanlikulturmedeniyeti.json",
    "osmanlikurulus": "osmanlikurulus.json"
};

// --- SES MOTORU (PC AYARLARI KORUNMUŞTUR) ---
const sesler = {
    dogru: new Audio('dogru.mp3'),
    yanlis: new Audio('yanlis.mp3'),
    bitis: new Audio('bitis.mp3')
};

// Ses Seviyeleri (Orijinal ayarlarınız korunmuştur)
sesler.dogru.volume = 1.0; 
sesler.yanlis.volume = 0.3; 
sesler.bitis.volume = 0.3; 

function sesUret(tur) {
    if (sesler[tur]) {
        sesler[tur].pause();
        sesler[tur].currentTime = 0;
        sesler[tur].play().catch(e => console.log("Ses hatası:", e));
    }
}

// --- TEST YÖNETİMİ ---
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const testParam = urlParams.get('id'); 
    
    if (testParam) {
        const onEk = testParam.substring(0, testParam.lastIndexOf('_'));
        const dosyaAdi = DOSYA_ESLESTIRME[onEk];
        const testNoStr = testParam.substring(testParam.lastIndexOf('_') + 5); 
        const testNo = parseInt(testNoStr); 
        
        if (dosyaAdi && !isNaN(testNo)) {
            testiYukle(dosyaAdi, testNo);
        } else {
             const soruAlani = document.getElementById("soru-alani");
             if(soruAlani) {
                 soruAlani.innerHTML = `<div style="text-align:center; padding:20px;"><div class="baslik-h2-gibi">Test ID Eşleşme Hatası</div><p>Lütfen testler.html dosyasındaki ID'leri kontrol edin.</p><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
                 if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
             }
        }
    } else {
        const soruAlani = document.getElementById("soru-alani");
        if(soruAlani) {
             soruAlani.innerHTML = `<div style="text-align:center; padding:20px;"><div class="baslik-h2-gibi">Test Bulunamadı</div><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
            if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
        }
    }
});

// JSON dosyasını çekme ve testi başlatma fonksiyonu
function testiYukle(dosyaAdi, testNo) {
    const url = JSON_PATH + dosyaAdi;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Dosya yüklenemedi veya sunucu hatası: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // BURASI KRİTİK: JSON tek bir dizi içinde tek bir obje olmalı.
            // Düzeltilmiş JSON ile data[0] tüm testleri (1-5) kapsayacak.
            const ustBaslikObj = data[0]; 
            
            if (ustBaslikObj && ustBaslikObj.tests) {
                const istenenTest = ustBaslikObj.tests[testNo - 1]; 

                if (istenenTest) {
                    mevcutSorular = istenenTest.sorular;
                    kullaniciCevaplari = new Array(mevcutSorular.length).fill(null);
                    navigasyonButonlariniEkle();
                    soruyuGoster(0);
                } else {
                    document.getElementById("soru-alani").innerHTML = `<div style="text-align:center; padding:20px;"><div class="baslik-h2-gibi">Test No Bulunamadı</div><p>Lütfen JSON dosyasındaki test numaralarını kontrol edin.</p><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
                }
            } else {
                 document.getElementById("soru-alani").innerHTML = `<div style="text-align:center; padding:20px;"><div class="baslik-h2-gibi">JSON Yapısı Hatalı</div><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
            }
        })
        .catch(error => {
            console.error("JSON çekme hatası:", error);
            const soruAlani = document.getElementById("soru-alani");
            soruAlani.innerHTML = `<div style="text-align:center; padding:20px; color:#ff0000;"><div class="baslik-h2-gibi">Veri Yükleme Hatası (JSON Hatalı)</div><p>Lütfen Konsol (F12) üzerinden hatanın kaynağını kontrol edin. Muhtemelen bir JSON dosyasında virgül, tırnak veya parantez hatası var.</p><a href="testler.html" class"aksiyon-butonu">Testlere Dön</a></div>`;
        });
}


function navigasyonButonlariniEkle() {
    const soruAlani = document.getElementById("soru-alani");
    if(document.querySelector(".navigasyon-alani")) return;
    const navDiv = document.createElement("div");
    navDiv.className = "navigasyon-alani";
    navDiv.innerHTML = `<button id="btn-onceki" class="nav-buton" onclick="oncekiSoru()">&lt; Önceki</button><button id="btn-sonraki" class="nav-buton" onclick="sonrakiSoru()">Sonraki &gt;</button>`;
    soruAlani.appendChild(navDiv);
}

function oncekiSoru() { if (mevcutSoruIndex > 0) soruyuGoster(mevcutSoruIndex - 1); }
function sonrakiSoru() { if (mevcutSoruIndex < mevcutSorular.length - 1) soruyuGoster(mevcutSoruIndex + 1); }

// --- ERİŞİLEBİLİRLİK İÇİN YENİDEN TASARLANMIŞ SORU MOTORU ---
function soruyuGoster(index) {
    window.scrollTo({ top: 0, behavior: 'auto' });

    const uyariKutusu = document.getElementById("sesli-uyari");
    if(uyariKutusu) uyariKutusu.innerText = "";
    
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    if (gorselUyari) gorselUyari.style.display = "none";

    mevcutSoruIndex = index;
    const soruObj = mevcutSorular[index];
    isaretlemeKilitli = false; 
    
    // İlerleme Çubuğu
    const yuzde = ((index + 1) / mevcutSorular.length) * 100;
    const cubuk = document.getElementById("ilerleme-cubugu");
    if(cubuk) cubuk.style.width = `${yuzde}%`;

    // --------------------------------------------------------
    // ** ERİŞİLEBİLİRLİK ODAKLI YAPI (NVDA + H TUŞU + ÖNCÜL AYARI) **
    // --------------------------------------------------------
    
    // 1. Soru Sayacı: H Tuşu ile bulunabilmesi için başlık özelliği KORUNDU.
    const soruSayacElement = document.getElementById("soru-sayac");
    soruSayacElement.innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;
    
    // Sadece odaklanma için tabindex var, rol silme kodu YOK.
    soruSayacElement.setAttribute("tabindex", "-1"); 

    // 2. Soru Metni Alanı:
    const soruBaslik = document.getElementById("soru-metni");
    soruBaslik.removeAttribute('aria-hidden'); 
    soruBaslik.removeAttribute('role'); 
    soruBaslik.setAttribute('tabindex', '-1'); 

    // Varsa eski "sessiz okuma alanı"nı temizle
    const eskiSessizAlan = document.getElementById("sessiz-okuma-alani");
    if (eskiSessizAlan) eskiSessizAlan.remove();

    let finalHTML = "";
    let anaSoruMetni = soruObj.soru || ""; 
    let girisMetni = soruObj.onculGiris || "";
    
    let ustMetin = girisMetni;
    if (anaSoruMetni && girisMetni && anaSoruMetni !== girisMetni) { 
    } 
    
    // Giriş Metni (Paragraf)
    if (girisMetni) {
        finalHTML += `<p class="soru-giris" style="margin-bottom:10px;">${girisMetni}</p>`;
    }
    
    // Ana Soru Metni (Paragraf)
    if (anaSoruMetni && anaSoruMetni !== girisMetni) {
         finalHTML += `<p class="soru-ana-metin" style="margin-bottom:10px;">${anaSoruMetni}</p>`;
    }

    // --- ÖNCÜLLER (NVDA İÇİN PARAGRAF AYARI) ---
    // Her biri ayrı paragraf (<p>) olduğu için NVDA her birini ayrı okuyup duracak.
    let onculHTML = "";
    if (soruObj.onculler && soruObj.onculler.length > 0) {
        onculHTML += `<div class='oncul-kapsayici' style="margin: 10px 0;">`; 
        soruObj.onculler.forEach(oncul => {
            const match = oncul.match(/^(\d+\.?|\w\.?)\s*(.*)/);
            let numara = match ? match[1] : ''; 
            let metin = match ? match[2] : oncul;
            
            if (!numara && metin.split(" ").length > 1 && /^\d+\./.test(metin.trim())) {
                 numara = metin.split(" ")[0];
                 metin = metin.substring(numara.length).trim();
            }
            
            // BURASI DEĞİŞTİ: <div class='oncul-satir'> YERİNE <p class='oncul-satir'>
            // Bu sayede NVDA satır satır okuyacak.
            onculHTML += `
                <p class='oncul-satir' style="margin-bottom:5px;">
                    <span class='oncul-no' style="font-weight:bold; margin-right:5px;">${numara}</span>
                    <span class='oncul-yazi'>${metin}</span>
                </p>`;
        });
        onculHTML += `</div>`;
    }

    // Soru Kökü (Paragraf)
    let soruKokuHTML = "";
    if (soruObj.soruKoku) {
        soruKokuHTML = `<p class='soru-koku-vurgu' style="font-weight:bold; margin-top:10px;">${soruObj.soruKoku}</p>`;
    }

    const yerlesim = soruObj.oncul_yerlesim || "ONCE_KOK"; 
    
    if (yerlesim === "ONCE_KOK") {
        finalHTML += onculHTML;    
        finalHTML += soruKokuHTML; 
    } else if (yerlesim === "SONRA_KOK") {
        finalHTML += soruKokuHTML;
        finalHTML += onculHTML;
    } else {
        finalHTML += onculHTML; 
        finalHTML += soruKokuHTML;
    }

    soruBaslik.innerHTML = finalHTML;

    // ŞIKLARIN OLUŞTURULMASI
    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";
    
    const uzunSikVar = soruObj.secenekler.some(sik => sik.length > 40);
    if (uzunSikVar) siklarKutusu.classList.add("tek-sutun");
    else siklarKutusu.classList.remove("tek-sutun");

    if (!document.getElementById("gorsel-uyari-alani")) {
        const div = document.createElement("div");
        div.id = "gorsel-uyari-alani"; div.className = "gorsel-uyari-kutusu";
        document.getElementById("soru-alani").appendChild(div);
    }

    soruObj.secenekler.forEach((sik, i) => { 
        const btn = document.createElement("button");
        const harf = getSikHarfi(i);
        
        btn.innerText = harf + ") " + sik;
        btn.className = "sik-butonu";
        
        btn.setAttribute("aria-label", `${harf} şıkkı: ${sik}`); 

        if (kullaniciCevaplari[index] !== null) {
            if (harf === getSikHarfi(kullaniciCevaplari[index])) {
                if (harf === soruObj.dogru_cevap) { btn.classList.add("dogru"); } else { btn.classList.add("yanlis"); } 
            }
            btn.disabled = true;
        }
        btn.onclick = () => cevapIsaretle(i, btn);
        siklarKutusu.appendChild(btn);
    });

    document.getElementById("btn-onceki").disabled = (index === 0);
    document.getElementById("btn-sonraki").disabled = (index === mevcutSorular.length - 1);

    // ODAK YÖNETİMİ
    if (kullaniciCevaplari[index] === null) {
        soruSayacElement.focus();
    }
}

// --- CEVAP İŞARETLEME (MOBİL/PC AYIRIMI KORUNDU) ---
function cevapIsaretle(secilenIndex, btnElement) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true;
    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    const dogruCevapHarf = mevcutSorular[mevcutSoruIndex].dogru_cevap; 
    const secilenCevapHarf = getSikHarfi(secilenIndex); 

    const uyariKutusu = document.getElementById("sesli-uyari");
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    
    const sikHarfi = secilenCevapHarf; 
    let durumMetniDetayli = ""; 
    let durumMetniKisa = ""; 

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    const dogruMu = (secilenCevapHarf === dogruCevapHarf);
    const gorselMetin = dogruMu ? "DOĞRU CEVAP!" : "YANLIŞ CEVAP!";
    const gorselClass = dogruMu ? "uyari-dogru" : "uyari-yanlis";
    
    gorselUyari.innerText = gorselMetin;
    gorselUyari.className = "gorsel-uyari-kutusu " + gorselClass;
    gorselUyari.style.display = "block";

    if (dogruMu) {
        btnElement.classList.add("dogru"); 
        durumMetniDetayli = "Doğru cevap."; 
        durumMetniKisa = "Doğru cevap."; 
        sesUret("dogru"); 
    } else {
        btnElement.classList.add("yanlis"); 
        const dogruButon = Array.from(document.querySelectorAll(".sik-butonu")).find(b => b.innerText.startsWith(dogruCevapHarf + ")"));
        if(dogruButon) dogruButon.classList.add("dogru");
        
        durumMetniDetayli = "Yanlış cevap. Doğru cevap " + dogruCevapHarf + " şıkkıydı."; 
        durumMetniKisa = "Yanlış cevap."; 
        sesUret("yanlis"); 
    }

    if (!isMobile) {
        uyariKutusu.setAttribute("role", "alert"); 
        uyariKutusu.setAttribute("aria-live", "assertive"); 
        uyariKutusu.innerText = sikHarfi + " şıkkını işaretlediniz. " + durumMetniDetayli;
    } 
    else {
        setTimeout(() => { 
             uyariKutusu.innerText = durumMetniKisa; 
             if (uyariKutusu.tabIndex === -1) uyariKutusu.tabIndex = 0; 
             uyariKutusu.focus();
        }, 350); 
    }

    const toplamGecisSuresi = isMobile ? 1750 : 2500; 

    const tumButonlar = document.querySelectorAll(".sik-butonu");
    tumButonlar.forEach(b => b.disabled = true);

    setTimeout(() => {
        uyariKutusu.innerText = ""; 
        uyariKutusu.removeAttribute("role"); 
        uyariKutusu.removeAttribute("aria-live");
        if (isMobile) uyariKutusu.removeAttribute("tabindex"); 
        gorselUyari.style.display = "none";

        if (mevcutSoruIndex < mevcutSorular.length - 1) { 
            sonrakiSoru(); 
        } 
        else {
             sesUret("bitis");
             const bitirButonu = document.getElementById("bitir-buton");
             if(bitirButonu) {
                 bitirButonu.focus();
                 uyariKutusu.setAttribute("role", "alert"); 
                 uyariKutusu.setAttribute("aria-live", "assertive"); 
                 uyariKutusu.innerText = "Test bitti. Sonuçları görmek için bitir düğmesine basınız.";
             }

             gorselUyari.className = "gorsel-uyari-kutusu"; gorselUyari.style.display = "block";
             gorselUyari.style.backgroundColor = "#000"; gorselUyari.style.color = "#ffff00";
             gorselUyari.style.border = "2px solid #fff"; gorselUyari.innerText = "TEST BİTTİ";
        }
    }, toplamGecisSuresi);
}

function getSikHarfi(index) { return ["A", "B", "C", "D", "E"][index]; }

// --- TEST BİTİRME FONKSİYONU ---
function testiBitir() {
    let dogruSayisi = 0; let yanlisSayisi = 0; let bosSayisi = 0;
    for (let i = 0; i < mevcutSorular.length; i++) {
        const dogruCevapHarf = mevcutSorular[i].dogru_cevap;
        const secilenCevapHarf = kullaniciCevaplari[i] !== null ? getSikHarfi(kullaniciCevaplari[i]) : null;

        if (secilenCevapHarf === null) bosSayisi++;
        else if (secilenCevapHarf === dogruCevapHarf) dogruSayisi++;
        else yanlisSayisi++;
    }
    const net = dogruSayisi - (yanlisSayisi / 4);
    let puan = net * 5; if (puan < 0) puan = 0;

    let motivasyonMesaji = ""; let mesajRengi = "";
    if (puan >= 80) { motivasyonMesaji = "🏆 Mükemmel! Konuya son derece hakimsin."; mesajRengi = "#00ff00"; } 
    else if (puan >= 50) { motivasyonMesaji = "👍 Gayet iyisin! Biraz daha tekrarla harika olursun."; mesajRengi = "#ffff00"; } 
    else { motivasyonMesaji = "💪 Pes etmek yok! Tekrar yaparak başaracaksın."; mesajRengi = "#ff9999"; }

    document.getElementById("soru-alani").style.display = "none";
    document.getElementById("bitir-buton").style.display = "none";
    document.getElementById("sonuc-alani").style.display = "block";

    const sonucHTML = `
        <div style="border: 4px solid #fff; padding: 20px; border-radius: 10px; margin-bottom: 20px; background:#000;">
            <div style="color:${mesajRengi}; font-size: 1.8rem; margin: 0 0 10px 0;">${motivasyonMesaji}</div>
        </div>
        <p style="font-size:1.5rem; color:#fff;"><strong>TOPLAM PUAN: ${puan.toFixed(2)} / 100</strong></p>
        <p style="font-size:1.2rem; color:#ccc;">Doğru: ${dogruSayisi} | Yanlış: ${yanlisSayisi} | Boş: ${bosSayisi}</p>
        <p style="font-size:1.4rem; color:#ffff00;">Net: ${net.toFixed(2)}</p>
        <br>
        <button class="nav-buton" onclick="cevapAnahtariniGoster()" style="width:100%; padding:20px; font-size:1.4rem; border:2px solid #ffff00; color:#ffff00; background:#000; font-weight:bold;">📝 CEVAP ANAHTARI (Tüm Soruları İncele)</button>
    `;
    
    document.getElementById("puan-detay").innerHTML = sonucHTML;
    document.getElementById("sonuc-alani").focus();
}

// --- CEVAP ANAHTARI DETAYLARI ---
function cevapAnahtariniGoster() {
    const listeDiv = document.getElementById("yanlis-detaylari");
    listeDiv.innerHTML = "";
    
    const baslik = document.getElementById("yanlislar-baslik");
    if(baslik) baslik.innerHTML = `<div class="baslik-h2-gibi">CEVAP ANAHTARI</div>`;
    
    document.getElementById("yanlislar-listesi").style.display = "block";
    
    mevcutSorular.forEach((soru, index) => {
        const kullaniciCevabiIndex = kullaniciCevaplari[index];
        const dogruCevapHarf = soru.dogru_cevap;
        const kart = document.createElement("div"); 
        kart.className = "yanlis-soru-karti";
        
        let durumRengi = "";
        let durumMetni = "";
        let sonucIkonu = "";
        
        const secilenCevapHarf = kullaniciCevabiIndex !== null ? getSikHarfi(kullaniciCevaplari[index]) : null;
        
        if (secilenCevapHarf === null) {
            durumRengi = "#ffff00"; 
            sonucIkonu = "❔";
            durumMetni = "BOŞ BIRAKILDI";
            kart.style.borderLeft = "6px solid #ffff00";
        } else if (secilenCevapHarf === dogruCevapHarf) {
            durumRengi = "#00ff00"; 
            sonucIkonu = "✅";
            durumMetni = "DOĞRU CEVAP VERİLDİ";
            kart.style.borderLeft = "6px solid #00ff00";
        } else {
            durumRengi = "#ff0000"; 
            sonucIkonu = "❌";
            durumMetni = "YANLIŞ CEVAP VERİLDİ";
            kart.style.borderLeft = "6px solid #ff0000";
        }

        let soruMetniGoster = "";
        if (soru.onculler) {
            if(soru.onculGiris) soruMetniGoster += `<div style="margin-bottom:5px;">${soru.onculGiris}</div>`;
            soru.onculler.forEach(o => soruMetniGoster += `<div style="padding-left:10px;">${o}</div>`);
            if(soru.soruKoku) soruMetniGoster += `<div style="margin-top:10px; font-weight:bold;">${soru.soruKoku}</div>`;
        } else {
            soruMetniGoster = soru.soru;
        }
        
        const dogruCevapIndex = ["A", "B", "C", "D", "E"].indexOf(dogruCevapHarf); 

        kart.innerHTML = `
            <div style="border-bottom:1px solid #444; padding-bottom:10px; margin-bottom:10px;">
                <div style="margin:0; color:#888;">Soru ${index + 1} ${sonucIkonu}</div>
                <div style="margin-top:10px; font-size:1.1rem;">${soruMetniGoster}</div>
            </div>
            
            <p style="color:${durumRengi}; font-size:1.1rem; margin-bottom:5px;">
                <strong>Sizin Cevabınız:</strong> ${secilenCevapHarf !== null ? secilenCevapHarf + ") " + soru.secenekler[kullaniciCevabiIndex] : 'Boş Bırakıldı'}
                <span style="font-weight:bold; color:${durumRengi};">(${durumMetni})</span>
            </p>
            
            <p style="color:#00ff00; font-size:1.1rem; margin-bottom:10px;">
                <strong>Doğru Cevap:</strong> ${dogruCevapHarf}) ${soru.secenekler[dogruCevapIndex]}
            </p>
            
            <div class="aciklama-kutusu" style="background:#111; padding:15px; border-radius:8px; border:1px solid #333; margin-top:10px;">
                <strong style="color:#ffff00; display:block; margin-bottom:5px;">💡 Açıklama:</strong> 
                <span style="color:#ddd;">${soru.aciklama || 'Açıklama mevcut değil.'}</span>
            </div>
        `;
        listeDiv.appendChild(kart);
    });

    baslik.focus();
}