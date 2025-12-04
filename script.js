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
            const soruAlani = document.getElementById("soru-alani");
            soruAlani.innerHTML = `<div style="text-align:center; padding:20px; color:#ff0000;"><h2>Veri Yükleme Hatası (JSON Hatalı)</h2><p>Lütfen Konsol (F12) üzerinden hatanın kaynağını kontrol edin. Muhtemelen bir JSON dosyasında virgül, tırnak veya parantez hatası var.</p><a href="testler.html" class"aksiyon-butonu">Testlere Dön</a></div>`;
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

// --- YENİ SORU GÖSTERME MOTORU (NVDA DÜZELTME UYGULANDI) ---
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
    // ** NVDA DÜZELTME ALANI **: Kesin Çözüm Mantığı
    // --------------------------------------------------------
    const soruBaslik = document.getElementById("soru-metni");
    // ARIA etiketlerini temizle (Başlık rolünü kaldırmak için)
    soruBaslik.removeAttribute('role'); 
    soruBaslik.removeAttribute('aria-label');

    let finalHTML = "";
    let anaSoruMetni = soruObj.soru || ""; 
    let onculHTML = "";
    let soruKokuVurguluHTML = ""; 
    let girisMetni = soruObj.onculGiris || "";
    
    // Vurgulu Soru Kökü HTML'ini oluştur
    if (soruObj.soruKoku) {
        // NVDA tarafından başlık (heading) olarak algılanmaması için P kullanıldı.
        soruKokuVurguluHTML = `<p class='soru-koku-vurgu'>${soruObj.soruKoku}</p>`;
    }

    // Öncül HTML'ini hazırla
    if (soruObj.onculler && soruObj.onculler.length > 0) {
        // Öncül kutusuna role="list" verildi. Bu, NVDA'nın "liste başlangıcı" demesini sağlar.
        onculHTML += `<div class='oncul-kapsayici' role="list">`; 
        soruObj.onculler.forEach(oncul => {
            // Öncülleri numara ve metin olarak ayır
            const match = oncul.match(/^(\d+\.?|\w\.?)\s*(.*)/);
            let numara = match ? match[1] : ''; 
            let metin = match ? match[2] : oncul;
            
            // Eğer numara boşsa (1. konya gibi), numara olarak kullan ve metinden çıkar
            if (!numara && metin.split(" ").length > 1 && /^\d+\./.test(metin.trim())) {
                 numara = metin.split(" ")[0];
                 metin = metin.substring(numara.length).trim();
            }
            
            // DÜZELTME: NVDA'nın '1', '2' demesi için role="listitem" kullanılır. 
            // Bu, başlık uyarısı vermeden satır satır okumayı garantiler.
            onculHTML += `
                <p class='oncul-satir' role="listitem">
                    <span class='oncul-no' aria-hidden="true">${numara}</span>
                    <span class='oncul-yazi'>${metin}</span>
                </p>`;
        });
        onculHTML += `</div>`; // role="list" bitişi

        // Öncül Giriş Metni ve Ana Metni Birleştir
        let ustMetin = girisMetni;
        if (anaSoruMetni && girisMetni) {
            ustMetin += " " + anaSoruMetni;
        } else if (anaSoruMetni) {
            ustMetin = anaSoruMetni;
        }
        
        // DÜZELTME: Ana Metin için P tagı kullanıldı. Role="heading" YOK. 
        // NVDA, sorunun başına geldiğinde "Başlık" demeden okumaya başlar.
        if (ustMetin) {
            finalHTML += `<p class="soru-giris">${ustMetin}</p>`; 
        }

        // Akış Kararı: JSON'daki oncul_yerlesim etiketine göre yerleştirme
        const yerlesim = soruObj.oncul_yerlesim || "ONCE_KOK"; 
        
        if (yerlesim === "ONCE_KOK") {
            // İstenen: Metin (P) -> Öncül Kutusu (List) -> Koyu Soru Kökü (P)
            finalHTML += onculHTML;
            finalHTML += soruKokuVurguluHTML;
        } else if (yerlesim === "SONRA_KOK") {
            // İstenen: Metin (P) -> Koyu Soru Kökü (P) -> Öncül Kutusu (List)
            finalHTML += soruKokuVurguluHTML;
            finalHTML += onculHTML;
        } else if (yerlesim === "ASAGIDAKI_SKIP") {
            // İstenen: Metin (P) -> Öncül Kutusu (List) -> DİREKT ŞIKLAR
            finalHTML += onculHTML;
            // soruKokuVurguluHTML atlanır.
        }

    } else {
        // Öncülsüz Sorular
        // NVDA Düzeltmesi: Öncül yoksa, ana soruyu P tagı içine alıyoruz (Başlık rolü yok)
        finalHTML = `<p class="soru-giris">${anaSoruMetni}</p>`;
        finalHTML += soruKokuVurguluHTML;
    }
    
    // H2'nin içine final HTML'i yerleştir
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
        // NVDA'ya doğru şık harfini okutmak için aria-label eklendi (Önceki kodda yoktu, bu önemli bir erişilebilirlik eklemesi)
        btn.setAttribute("aria-label", `${getSikHarfi(i)} şıkkı: ${sik}`); 

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

    // Soruyu Başlatmak için odak noktası, şıklar değil, ana soru metni olmalı.
    if (kullaniciCevaplari[index] === null) {
        // Ana soru metnini ve öncülleri içeren soruBaslik div'ine tabIndex ekleyerek odaklanılmasını sağlarız.
        soruBaslik.setAttribute("tabindex", "0");
        soruBaslik.focus();
        soruBaslik.removeAttribute("tabindex"); // Odaklandıktan sonra tab sırasından çıkarılır
    }
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
    // MOBİL AYARINIZ KORUNDU: Mobil cihazlarda zorunlu odak yönetimi için tespit korunmuştur.
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
        // DOĞRU CEVABI GÖSTER
        const dogruButon = Array.from(document.querySelectorAll(".sik-butonu")).find(b => b.innerText.startsWith(dogruCevapHarf + ")"));
        if(dogruButon) dogruButon.classList.add("dogru");
        
        // Yanlış cevabı işaretledikten sonra, doğru cevabın harfi ile detaylı bilgi verme özelliği korundu.
        durumMetniDetayli = "Yanlış cevap. Doğru cevap " + dogruCevapHarf + " şıkkıydı."; 
        durumMetniKisa = "Yanlış cevap."; 
        sesUret("yanlis"); 
    }

    // --- PC/MOBİL ANNOUNCEMENT AYRIMI (PC SÜRE VE ROL AYARLARI KORUNMUŞTUR) ---
    if (!isMobile) {
        // PC'de ayrıntılı geri bildirim ve rol korundu.
        uyariKutusu.setAttribute("role", "alert"); 
        uyariKutusu.setAttribute("aria-live", "assertive"); 
        uyariKutusu.innerText = sikHarfi + " şıkkını işaretlediniz. " + durumMetniDetayli;
    } 
    else {
        // MOBİL AYARINIZ KORUNDU: Mobil odak yönetimi korunmuştur.
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
             // Bitirme odak yönetimi korundu
             const bitirButonu = document.getElementById("bitir-buton");
             if(bitirButonu) {
                 bitirButonu.focus();
                 // Ekran okuyucuya bilgi verme
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

        // Soru Metnini Hazırla (Akıllı Gösterim)
        let soruMetniGoster = "";
        if (soru.onculler) {
            if(soru.onculGiris) soruMetniGoster += `<div style="margin-bottom:5px;">${soru.onculGiris}</div>`;
            // Öncülleri tek tek ekle
            soru.onculler.forEach(o => soruMetniGoster += `<div style="padding-left:10px;">${o}</div>`);
            // Soru kökünü kalın ve ayrı bir satırda ekle
            if(soru.soruKoku) soruMetniGoster += `<div style="margin-top:10px; font-weight:bold;">${soru.soruKoku}</div>`;
        } else {
            // Öncülsüz ise direkt soru metnini kullan
            soruMetniGoster = soru.soru;
        }
        
        const dogruCevapIndex = ["A", "B", "C", "D", "E"].indexOf(dogruCevapHarf); 

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