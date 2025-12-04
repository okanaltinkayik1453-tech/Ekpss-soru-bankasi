// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;

// JSON DOSYALARININ YOLU
const JSON_PATH = './data/';

// JSON Dosya Adı Eşleştirme Haritası
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

// Ses Seviyeleri (Sizin orijinal ayarlarınız korunmuştur)
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
        // 1. Linkten gelen test ön ekini ayır (örn: ilkturkislam_test1 -> ilkturkislam)
        const onEk = testParam.substring(0, testParam.lastIndexOf('_'));
        
        // 2. Eşleştirme haritasından tam dosya adını al
        const dosyaAdi = DOSYA_ESLESTIRME[onEk];
        
        // 3. Test numarasını al (örn: test1 -> 1)
        const testNoStr = testParam.substring(testParam.lastIndexOf('_') + 5); 
        const testNo = parseInt(testNoStr); 
        
        if (dosyaAdi && !isNaN(testNo)) {
            testiYukle(dosyaAdi, testNo);
        } else {
             const soruAlani = document.getElementById("soru-alani");
             if(soruAlani) {
                 soruAlani.innerHTML = `<div style="text-align:center; padding:20px;"><h2>Test ID Eşleşme Hatası</h2><p>Lütfen testler.html dosyasındaki ID'leri kontrol edin.</p><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
                 if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
             }
        }
    } else {
        const soruAlani = document.getElementById("soru-alani");
        if(soruAlani) {
             soruAlani.innerHTML = `<div style="text-align:center; padding:20px;"><h2>Test Bulunamadı</h2><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
            if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
        }
    }
});

// Yeni: JSON dosyasını çekme ve testi başlatma fonksiyonu
function testiYukle(dosyaAdi, testNo) {
    const url = JSON_PATH + dosyaAdi;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                // Eğer yüklenemezse, kullanıcıya net bir hata mesajı gönder
                throw new Error(`Dosya yüklenemedi: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const ustBaslikObj = data[0]; 
            
            if (ustBaslikObj && ustBaslikObj.tests) {
                // İstenen alt testi bul (Test 1 -> 0. index)
                const istenenTest = ustBaslikObj.tests[testNo - 1]; 

                if (istenenTest) {
                    mevcutSorular = istenenTest.sorular;
                    kullaniciCevaplari = new Array(mevcutSorular.length).fill(null);
                    navigasyonButonlariniEkle();
                    soruyuGoster(0);
                } else {
                    document.getElementById("soru-alani").innerHTML = `<div style="text-align:center; padding:20px;"><h2>Test No Bulunamadı</h2><p>Lütfen JSON dosyasındaki test numaralarını kontrol edin.</p><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
                }
            } else {
                 document.getElementById("soru-alani").innerHTML = `<div style="text-align:center; padding:20px;"><h2>JSON Yapısı Hatalı</h2><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
            }
        })
        .catch(error => {
            console.error("JSON çekme hatası:", error);
            // Hata mesajını kullanıcıya gösterirken dosya adını vurgula
            const soruAlani = document.getElementById("soru-alani");
            soruAlani.innerHTML = `<div style="text-align:center; padding:20px; color:#ff0000;"><h2>Veri Yükleme Hatası</h2><p>Uygulama, gerekli olan dosyayı bulamadı: <b>${url}</b></p><p>Lütfen GitHub'daki dosya adlarını ve yolunu kontrol edin.</p><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
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

// --- YENİ SORU GÖSTERME MOTORU (YAPISAL FORMAT) ---
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
    // ** NVDA HATA GİDERME **: Sadece h2'nin içini düz metin yapıyoruz.
    // --------------------------------------------------------
    const soruBaslik = document.getElementById("soru-metni");
    
    let finalHTML = "";
    let anaSoruMetni = soruObj.soru || ""; 
    let soruKokuVurgulu = "";
    
    if (soruObj.onculler && soruObj.onculler.length > 0) {
        
        // 1. Giriş Metni (Varsa)
        if (soruObj.onculGiris) {
            finalHTML += `<p>${soruObj.onculGiris}</p>`; // P etiketi düz metin okutur
        }
        
        // 2. Öncül Kutusu (Sarı Çizgili Alan)
        finalHTML += `<div class='oncul-kapsayici'>`;
        soruObj.onculler.forEach(oncul => {
            let numara = oncul.split(" ")[0]; 
            let metin = oncul.substring(numara.length).trim();
            
            finalHTML += `
                <div class='oncul-satir'>
                    <span class='oncul-no'>${numara}</span>
                    <span class='oncul-yazi'>${metin}</span>
                </div>`;
        });
        finalHTML += `</div>`;
        
        // 3. Soru Kökü (Alttaki Vurgulu Kısım)
        if (soruObj.soruKoku) {
            soruKokuVurgulu = soruObj.soruKoku;
        }

    } else {
        // 2. Öncülsüz Sorular için direkt P etiketi
        finalHTML = `<p>${anaSoruMetni}</p>`; 
    }

    // Vurgulu soru kökü varsa en sona ekle
    if (soruKokuVurgulu) {
        finalHTML += `<p class='soru-koku-vurgu'>${soruKokuVurgulu}</p>`; // P etiketi düz metin okutur
    }

    // H2'nin içine sadece final HTML'i yerleştiriyoruz.
    // Bu sayede NVDA sadece H2'yi "Başlık" der, geri kalanı düz metin okur.
    soruBaslik.innerHTML = finalHTML;
    
    // --------------------------------------------------------

    document.getElementById("soru-sayac").innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;
    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";
    
    // Uzun şık kontrolü
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
        btn.innerText = getSikHarfi(i) + ") " + sik;
        btn.className = "sik-butonu";
        if (kullaniciCevaplari[index] !== null) {
            if (getSikHarfi(i) === getSikHarfi(kullaniciCevaplari[index])) {
                if (getSikHarfi(i) === soruObj.dogru_cevap) { btn.classList.add("dogru"); } else { btn.classList.add("yanlis"); } 
            }
            btn.disabled = true;
        }
        btn.onclick = () => cevapIsaretle(i, btn);
        siklarKutusu.appendChild(btn);
    });

    document.getElementById("btn-onceki").disabled = (index === 0);
    document.getElementById("btn-sonraki").disabled = (index === mevcutSorular.length - 1);

    if (kullaniciCevaplari[index] === null) soruBaslik.focus();
}

// --- CEVAP İŞARETLEME (PC KORUNMUŞ, MOBİL ZORUNLU ODAK YÖNETİMİ) ---
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

    // --- CİHAZ TESPİTİ (PC AYARLARI KORUNMUŞTUR) ---
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    // --- GÖRSEL VE DURUM AYARLARI ---
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
        durumMetniDetayli = "Yanlış cevap."; 
        durumMetniKisa = "Yanlış cevap."; 
        sesUret("yanlis"); 
    }

    // --- PC/MOBİL ANNOUNCEMENT AYRIMI (PC SÜRE VE ROL AYARLARI KORUNMUŞTUR) ---
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

    // --- GENEL ZAMANLAMA VE GEÇİŞ ---
    const toplamGecisSuresi = isMobile ? 1750 : 2500; 

    const tumButonlar = document.querySelectorAll(".sik-butonu");
    tumButonlar.forEach(b => b.disabled = true);

    setTimeout(() => {
        // PC/Mobil temizliği
        uyariKutusu.innerText = ""; 
        uyariKutusu.removeAttribute("role"); 
        uyariKutusu.removeAttribute("aria-live");
        if (isMobile) uyariKutusu.removeAttribute("tabindex"); 
        gorselUyari.style.display = "none";

        if (mevcutSoruIndex < mevcutSorular.length - 1) { 
            sonrakiSoru(); 
        } 
        else {
             // Test bittiğinde
             sesUret("bitis");
             uyariKutusu.innerText = "Test bitti. Sonuçları görmek için bitir düğmesine basınız.";
             
             gorselUyari.className = "gorsel-uyari-kutusu"; gorselUyari.style.display = "block";
             gorselUyari.style.backgroundColor = "#000"; gorselUyari.style.color = "#ffff00";
             gorselUyari.style.border = "2px solid #fff"; gorselUyari.innerText = "TEST BİTTİ";
             document.getElementById("bitir-buton").focus();
        }
    }, toplamGecisSuresi);
}

function getSikHarfi(index) { return ["A", "B", "C", "D", "E"][index]; }

// --- TEST BİTİRME FONKSİYONU (CEVAP ANAHTARI BUTONU EKLENDİ) ---
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

    // Cevap Anahtarı butonu buraya dinamik olarak eklenir
    const sonucHTML = `
        <div style="border: 4px solid #fff; padding: 20px; border-radius: 10px; margin-bottom: 20px; background:#000;">
            <h3 style="color:${mesajRengi}; font-size: 1.8rem; margin: 0 0 10px 0;">${motivasyonMesaji}</h3>
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

// --- CEVAP ANAHTARI DETAYLARI (TÜM SORULARI GÖSTERME) ---
function cevapAnahtariniGoster() {
    const listeDiv = document.getElementById("yanlis-detaylari");
    listeDiv.innerHTML = "";
    
    const baslik = document.getElementById("yanlislar-baslik");
    if(baslik) baslik.innerText = "CEVAP ANAHTARI";
    
    document.getElementById("yanlislar-listesi").style.display = "block";
    
    mevcutSorular.forEach((soru, index) => {
        const kullaniciCevabiIndex = kullaniciCevaplari[index];
        const dogruCevapHarf = soru.dogru_cevap;
        const kart = document.createElement("div"); 
        kart.className = "yanlis-soru-karti";
        
        // DURUM BELİRLEME
        let durumRengi = "";
        let durumMetni = "";
        let sonucIkonu = "";
        
        const secilenCevapHarf = kullaniciCevabiIndex !== null ? getSikHarfi(kullaniciCevabiIndex) : null;
        
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

        // Soru Metnini Hazırla (Akıllı Gösterim)
        let soruMetniGoster = "";
        if (soru.onculler) {
            if(soru.onculGiris) soruMetniGoster += `<div style="margin-bottom:5px;">${soru.onculGiris}</div>`;
            soru.onculler.forEach(o => soruMetniGoster += `<div style="padding-left:10px;">${o}</div>`);
            if(soru.soruKoku) soruMetniGoster += `<div style="margin-top:10px; font-weight:bold;">${soru.soruKoku}</div>`;
        } else {
            soruMetniGoster = soru.soru;
        }
        
        const dogruCevapIndex = ["A", "B", "C", "D", "E"].indexOf(dogruCevapHarf); // Açıklamayı kolaylaştırmak için harfi indexe çevir

        // KART HTML'İNİ OLUŞTUR
        kart.innerHTML = `
            <div style="border-bottom:1px solid #444; padding-bottom:10px; margin-bottom:10px;">
                <h4 style="margin:0; color:#888;">Soru ${index + 1} ${sonucIkonu}</h4>
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