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

// --- SES MOTORU ---
const sesler = {
    dogru: new Audio('dogru.mp3'),
    yanlis: new Audio('yanlis.mp3'),
    bitis: new Audio('bitis.mp3')
};

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
             hataGoster("Test ID Eşleşme Hatası", "Lütfen testler.html dosyasındaki ID'leri kontrol edin.");
        }
    } else {
        hataGoster("Test Bulunamadı", "Lütfen ana sayfadan bir test seçiniz.");
    }
});

function hataGoster(baslik, mesaj) {
    const soruAlani = document.getElementById("soru-alani");
    if(soruAlani) {
        soruAlani.innerHTML = `<div style="text-align:center; padding:20px;"><div class="baslik-h2-gibi">${baslik}</div><p>${mesaj}</p><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
        if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
    }
}

function testiYukle(dosyaAdi, testNo) {
    const url = JSON_PATH + dosyaAdi;
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`Dosya yüklenemedi: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            const ustBaslikObj = data[0]; 
            if (ustBaslikObj && ustBaslikObj.tests) {
                const istenenTest = ustBaslikObj.tests[testNo - 1]; 
                if (istenenTest) {
                    mevcutSorular = istenenTest.sorular;
                    kullaniciCevaplari = new Array(mevcutSorular.length).fill(null);
                    navigasyonButonlariniEkle();
                    soruyuGoster(0);
                } else {
                    hataGoster("Test No Bulunamadı", "Test numarası JSON dosyasında yok.");
                }
            } else {
                 hataGoster("JSON Yapısı Hatalı", "Dosya formatı uygun değil.");
            }
        })
        .catch(error => {
            console.error("JSON Hatası:", error);
            hataGoster("Veri Yükleme Hatası", "JSON dosyasında hata olabilir. Konsolu kontrol edin.");
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

// ==========================================================
// --- SORU GÖSTERME (ORİJİNAL GÖRÜNÜM + VOICEOVER ODAK) ---
// ==========================================================
function soruyuGoster(index) {
    window.scrollTo({ top: 0, behavior: 'auto' });

    // Uyarıları Temizle
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

    // 1. SORU SAYACI
    const soruSayacElement = document.getElementById("soru-sayac");
    soruSayacElement.innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;
    // VoiceOver okusun ama başlık demesin diye temizliyoruz
    soruSayacElement.removeAttribute("role");
    soruSayacElement.removeAttribute("aria-level");

    // 2. HTML İÇERİĞİNİ HAZIRLAMA (Orijinal Yöntem)
    // Soru kökünü ve metinleri eskisi gibi HTML string olarak birleştiriyoruz.
    // Bu sayede CSS bozulmaz ve soru kökü olması gereken yerde çıkar.
    
    let finalHTML = "";
    let anaSoruMetni = soruObj.soru || ""; 
    let onculHTML = "";
    let soruKokuVurguluHTML = ""; 
    let girisMetni = soruObj.onculGiris || "";
    
    // Soru Kökü Hazırlığı
    if (soruObj.soruKoku) {
        soruKokuVurguluHTML = `<p class='soru-koku-vurgu'>${soruObj.soruKoku}</p>`;
    }

    // Öncül Hazırlığı
    if (soruObj.onculler && soruObj.onculler.length > 0) {
        onculHTML += `<div class='oncul-kapsayici'>`; 
        soruObj.onculler.forEach(oncul => {
            const match = oncul.match(/^(\d+\.?|\w\.?)\s*(.*)/);
            let numara = match ? match[1] : ''; 
            let metin = match ? match[2] : oncul;
            
            if (!numara && metin.split(" ").length > 1 && /^\d+\./.test(metin.trim())) {
                 numara = metin.split(" ")[0];
                 metin = metin.substring(numara.length).trim();
            }
            onculHTML += `
                <p class='oncul-satir'>
                    <span class='oncul-no'>${numara}</span>
                    <span class='oncul-yazi'>${metin}</span>
                </p>`;
        });
        onculHTML += `</div>`;

        let ustMetin = girisMetni;
        if (anaSoruMetni && girisMetni) { ustMetin += " " + anaSoruMetni; } 
        else if (anaSoruMetni) { ustMetin = anaSoruMetni; }
        
        if (ustMetin) { finalHTML += `<p class="soru-giris">${ustMetin}</p>`; } 

        const yerlesim = soruObj.oncul_yerlesim || "ONCE_KOK"; 
        
        if (yerlesim === "ONCE_KOK") {
            finalHTML += onculHTML;
            finalHTML += soruKokuVurguluHTML;
        } else if (yerlesim === "SONRA_KOK") {
            finalHTML += soruKokuVurguluHTML;
            finalHTML += onculHTML;
        } else if (yerlesim === "ASAGIDAKI_SKIP") {
            finalHTML += onculHTML;
        }

    } else {
        finalHTML = `<p class="soru-giris">${anaSoruMetni}</p>`;
        finalHTML += soruKokuVurguluHTML;
    }
    
    // 3. HTML'İ YERLEŞTİRME VE ODAK AYARI
    const soruMetniAlani = document.getElementById("soru-metni");
    
    // VoiceOver için Soru Başlığı ekliyoruz (Gizli ama okunur)
    // Soru 1, Soru 2 diye okuması için.
    const ekranOkuyucuBaslik = `<p style="position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0);">Soru ${index + 1}</p>`;
    
    soruMetniAlani.innerHTML = ekranOkuyucuBaslik + finalHTML;
    
    // VoiceOver'ın bu alanı bir "metin bloğu" olarak görmesi için:
    soruMetniAlani.setAttribute("role", "article"); 
    soruMetniAlani.setAttribute("aria-label", `Soru ${index + 1}`); 
    soruMetniAlani.setAttribute("tabindex", "-1"); // Odaklanılabilir yap
    
    // Eski "aria-hidden" varsa kaldıralım, çünkü artık burayı okutacağız
    soruMetniAlani.removeAttribute("aria-hidden");


    // 4. ŞIKLAR ALANI
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
        btn.innerText = getSikHarfi(i) + ") " + sik;
        btn.className = "sik-butonu";
        // VoiceOver için açık etiket
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

    // 5. ODAK YÖNETİMİ (Kritik)
    if (kullaniciCevaplari[index] === null) {
        // Sayfa geçişinde VoiceOver'ın yetişmesi için minik gecikme
        setTimeout(() => {
            if(soruMetniAlani) {
                soruMetniAlani.focus();
            }
        }, 150);
    }
}

// --- CEVAP İŞARETLEME ---
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

    // VoiceOver için Live Region Güncellemesi
    if (!isMobile) {
        uyariKutusu.setAttribute("role", "alert"); 
        uyariKutusu.setAttribute("aria-live", "assertive"); 
        uyariKutusu.innerText = sikHarfi + " şıkkını işaretlediniz. " + durumMetniDetayli;
    } 
    else {
        // Mobilde odak kaydırma daha sağlıklıdır
        setTimeout(() => { 
             uyariKutusu.innerText = durumMetniKisa; 
             // tabindex ekleyip odaklanıyoruz ki VoiceOver kesin okusun
             if (uyariKutusu.tabIndex === -1) uyariKutusu.tabIndex = -1; 
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
        <div tabindex="-1" id="sonuc-ozet-kutusu" style="border: 4px solid #fff; padding: 20px; border-radius: 10px; margin-bottom: 20px; background:#000;">
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

function cevapAnahtariniGoster() {
    const listeDiv = document.getElementById("yanlis-detaylari");
    listeDiv.innerHTML = "";
    
    const baslik = document.getElementById("yanlislar-baslik");
    if(baslik) baslik.innerHTML = `<div class="baslik-h2-gibi" tabindex="-1">CEVAP ANAHTARI</div>`;
    
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
            if(soru.onculGiris) soruMetniGoster += `<p>${soru.onculGiris}</p>`;
            soru.onculler.forEach(o => soruMetniGoster += `<p style="padding-left:10px;">${o}</p>`);
            if(soru.soruKoku) soruMetniGoster += `<p style="margin-top:10px; font-weight:bold;">${soru.soruKoku}</p>`;
        } else {
            soruMetniGoster = `<p>${soru.soru}</p>`;
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

    // Başlığa değil, ilk odaklanılabilir öğeye odakla
    if(document.querySelector(".baslik-h2-gibi")) {
        document.querySelector(".baslik-h2-gibi").focus();
    }
}
