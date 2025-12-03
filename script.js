// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;

// --- SES MOTORU (MP3 SİSTEMİ) ---
const sesler = {
    dogru: new Audio('dogru.mp3'),
    yanlis: new Audio('yanlis.mp3'),
    bitis: new Audio('bitis.mp3')
};

// Ses Seviyeleri
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
    const testID = urlParams.get('id');

    if (testID && typeof tumTestler !== 'undefined' && tumTestler[testID]) {
        mevcutSorular = tumTestler[testID];
        kullaniciCevaplari = new Array(mevcutSorular.length).fill(null);
        navigasyonButonlariniEkle();
        soruyuGoster(0);
    } else {
        const soruAlani = document.getElementById("soru-alani");
        if(soruAlani) {
             soruAlani.innerHTML = `<div style="text-align:center; padding:20px;"><h2>Test Bulunamadı</h2><a href="testler.html" class="aksiyon-butonu">Testlere Dön</a></div>`;
            if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
        }
    }
});

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

// --- SORU GÖSTERME FONKSİYONU ---
function soruyuGoster(index) {
    window.scrollTo({ top: 0, behavior: 'auto' });

    // Uyarı kutularını temizle
    const uyariKutusu = document.getElementById("sesli-uyari");
    if(uyariKutusu) {
        uyariKutusu.innerText = "";
        uyariKutusu.removeAttribute("role");
        uyariKutusu.removeAttribute("aria-live");
    }
    
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    if (gorselUyari) gorselUyari.style.display = "none";

    mevcutSoruIndex = index;
    const soruObj = mevcutSorular[index];
    isaretlemeKilitli = false; 
    
    const yuzde = ((index + 1) / mevcutSorular.length) * 100;
    const cubuk = document.getElementById("ilerleme-cubugu");
    if(cubuk) cubuk.style.width = `${yuzde}%`;

    const soruBaslik = document.getElementById("soru-metni");

    // Bilgisayar (NVDA) için ayarlar korundu
    soruBaslik.setAttribute("role", "presentation");
    soruBaslik.setAttribute("tabindex", "-1");
    
    let finalHTML = "";
    finalHTML += `<h2 class="sr-only">Soru ${index + 1}</h2>`;

    if (soruObj.onculler && soruObj.onculler.length > 0) {
        if (soruObj.onculGiris) {
            finalHTML += `<div>${soruObj.onculGiris}</div>`;
        }
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
        if (soruObj.soruKoku) {
            finalHTML += `<div class='soru-koku-vurgu'>${soruObj.soruKoku}</div>`;
        }
    } 
    else {
        let metin = soruObj.soru || "";
        finalHTML += metin;
    }

    soruBaslik.innerHTML = finalHTML;
    
    document.getElementById("soru-sayac").innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;
    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";
    
    // Şıkların uzunluğuna göre düzen
    const uzunSikVar = soruObj.siklar.some(sik => sik.length > 40);
    if (uzunSikVar) siklarKutusu.classList.add("tek-sutun");
    else siklarKutusu.classList.remove("tek-sutun");

    // Görsel uyarı alanı yoksa oluştur
    if (!document.getElementById("gorsel-uyari-alani")) {
        const div = document.createElement("div");
        div.id = "gorsel-uyari-alani"; div.className = "gorsel-uyari-kutusu";
        document.getElementById("soru-alani").appendChild(div);
    }

    soruObj.siklar.forEach((sik, i) => {
        const btn = document.createElement("button");
        const sikHarfi = getSikHarfi(i);
        btn.innerText = sikHarfi + ") " + sik;
        btn.setAttribute("aria-label", sikHarfi + " şıkkı: " + sik);
        btn.className = "sik-butonu";
        if (kullaniciCevaplari[index] !== null) {
            if (kullaniciCevaplari[index] === i) {
                if (i === soruObj.dogruCevap) { btn.classList.add("dogru"); } else { btn.classList.add("yanlis"); }
            }
            btn.disabled = true;
        }
        btn.onclick = () => cevapIsaretle(i, btn);
        siklarKutusu.appendChild(btn);
    });

    // İleri/Geri buton durumları
    document.getElementById("btn-onceki").disabled = (index === 0);
    document.getElementById("btn-sonraki").disabled = (index === mevcutSorular.length - 1);

    if (kullaniciCevaplari[index] === null) {
        soruBaslik.focus();
    }
}

// --- CEVAP İŞARETLEME (MOBİL İÇİN GARANTİ SES DÜZELTMESİ) ---
function cevapIsaretle(secilenIndex, btnElement) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true;
    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    const dogruCevapIndex = mevcutSorular[mevcutSoruIndex].dogruCevap;
    
    const uyariKutusu = document.getElementById("sesli-uyari");
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    const sikHarfi = ["A", "B", "C", "D", "E"][secilenIndex];

    // --- CİHAZ TESPİTİ ---
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    let sesliMetin = "";
    
    // Doğru/Yanlış durumunu ayarla
    if (secilenIndex === dogruCevapIndex) {
        btnElement.classList.add("dogru"); 
        
        gorselUyari.innerText = "DOĞRU CEVAP!"; 
        gorselUyari.classList.add("uyari-dogru"); 
        gorselUyari.style.display = "block";
        
        if (isMobile) {
            // MOBİL: Net ifade
            sesliMetin = "DOĞRU CEVAP";
        } else {
            // PC: Detaylı ifade + MP3
            sesUret("dogru");
            sesliMetin = sikHarfi + " şıkkını işaretlediniz. Doğru cevap.";
        }

    } else {
        btnElement.classList.add("yanlis"); 
        
        gorselUyari.innerText = "YANLIŞ CEVAP!"; 
        gorselUyari.classList.add("uyari-yanlis"); 
        gorselUyari.style.display = "block";
        
        if (isMobile) {
            // MOBİL: Net ifade
            sesliMetin = "YANLIŞ CEVAP";
        } else {
            // PC: Detaylı ifade + MP3
            sesUret("yanlis");
            sesliMetin = sikHarfi + " şıkkını işaretlediniz. Yanlış cevap.";
        }
    }

    // --- ZAMANLAMA AYARLARI (KRİTİK GÜNCELLEME) ---
    // Mobilde 250ms bekle. (VoiceOver'ın 'tık' sesinden sıyrılması için şart)
    // PC'de 200ms bekle (Eski ayar)
    const okumaBaslangicSuresi = isMobile ? 250 : 200; 
    
    // Mobilde 1350ms bekle. (Bu süre metnin okunması için yeterli ve hızlı)
    // PC'de 2500ms bekle (Eski ayar)
    const toplamGecisSuresi = isMobile ? 1350 : 2500;

    // Önce uyarı kutusunu temizle
    uyariKutusu.innerText = "";
    uyariKutusu.removeAttribute("role");
    
    // 1. AŞAMA: BİLDİRİMİ OKU
    setTimeout(() => {
        uyariKutusu.setAttribute("role", "alert"); 
        uyariKutusu.setAttribute("aria-live", "assertive");
        uyariKutusu.innerText = sesliMetin;
    }, okumaBaslangicSuresi); 

    // Şıklara tekrar basılmasını engelle
    const tumButonlar = document.querySelectorAll(".sik-butonu");
    tumButonlar.forEach(b => b.disabled = true);

    // 2. AŞAMA: OKUMA BİTİNCE DİĞER SORUYA GEÇ
    setTimeout(() => {
        // ÖNEMLİ DÜZELTME: Mobilde metni buradan manuel olarak SİLMİYORUZ. 
        // Silme işlemini 'soruyuGoster' fonksiyonuna bırakıyoruz.
        // Böylece geçiş anında VoiceOver susmuyor.
        
        if(!isMobile) {
             // PC'de eski usul temizlik yapabiliriz, sorun yok.
             uyariKutusu.innerText = ""; 
             uyariKutusu.removeAttribute("role"); 
             uyariKutusu.removeAttribute("aria-live");
        }

        gorselUyari.style.display = "none";
        
        if (mevcutSoruIndex < mevcutSorular.length - 1) { 
            sonrakiSoru(); 
        } 
        else {
             // Test bittiğinde
             sesUret("bitis"); 
             setTimeout(() => {
                 uyariKutusu.setAttribute("role", "alert");
                 uyariKutusu.setAttribute("aria-live", "assertive");
                 uyariKutusu.innerText = "Test bitti. Sonuçları görmek için bitir düğmesine basınız.";
             }, 1000);
             
             gorselUyari.className = "gorsel-uyari-kutusu"; gorselUyari.style.display = "block";
             gorselUyari.style.backgroundColor = "#000"; gorselUyari.style.color = "#ffff00";
             gorselUyari.style.border = "2px solid #fff"; gorselUyari.innerText = "TEST BİTTİ";
             
             document.getElementById("bitir-buton").focus();
        }
    }, toplamGecisSuresi); 
}

function getSikHarfi(index) { return ["A", "B", "C", "D", "E"][index]; }

// --- TEST BİTİRME ---
function testiBitir() {
    let dogruSayisi = 0; let yanlisSayisi = 0; let bosSayisi = 0;
    for (let i = 0; i < mevcutSorular.length; i++) {
        if (kullaniciCevaplari[i] === null) bosSayisi++;
        else if (kullaniciCevaplari[i] === mevcutSorular[i].dogruCevap) dogruSayisi++;
        else yanlisSayisi++;
    }
    const net = dogruSayisi - (yanlisSayisi / 4);
    let puan = net * 5; if (puan < 0) puan = 0;

    let motivasyonMesaji = ""; let mesajRengi = "";
    if (puan >= 80) { motivasyonMesaji = "🏆 Mükemmel! Konuya son derece hakimsin."; mesajRengi = "#00ff00"; } 
    else if (puan >= 50) { motivasyonMesaji = "👍 Gayet iyisin! Biraz daha tekrarla harika olursun."; mesajRengi = "#ffff00"; } 
    else { motivasyonMesaji = "💪 Pes etmek yok! Tekrar yaparak başaracaksın."; mesajRengi = "#ff9999"; }

    // Soruları gizle, sonuç alanını aç
    document.getElementById("soru-alani").style.display = "none";
    document.getElementById("bitir-buton").style.display = "none";
    document.getElementById("sonuc-alani").style.display = "block";

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

// --- CEVAP ANAHTARI DETAYLARI ---
function cevapAnahtariniGoster() {
    const listeDiv = document.getElementById("yanlis-detaylari");
    listeDiv.innerHTML = "";
    
    const baslik = document.getElementById("yanlislar-baslik");
    if(baslik) baslik.innerText = "CEVAP ANAHTARI";
    
    document.getElementById("yanlislar-listesi").style.display = "block";
    
    mevcutSorular.forEach((soru, index) => {
        const kullaniciCevabi = kullaniciCevaplari[index];
        const dogruCevap = soru.dogruCevap;
        const kart = document.createElement("div"); 
        kart.className = "yanlis-soru-karti"; 
        
        let durumRengi = "";
        let durumMetni = "";
        
        if (kullaniciCevabi === null) {
            durumRengi = "#ffff00"; 
            durumMetni = "BOŞ BIRAKILDI";
            kart.style.borderLeft = "6px solid #ffff00";
        } else if (kullaniciCevabi === dogruCevap) {
            durumRengi = "#00ff00"; 
            durumMetni = soru.siklar[kullaniciCevabi] + " (DOĞRU)";
            kart.style.borderLeft = "6px solid #00ff00";
        } else {
            durumRengi = "#ff0000"; 
            durumMetni = soru.siklar[kullaniciCevabi] + " (YANLIŞ)";
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

        kart.innerHTML = `
            <div style="border-bottom:1px solid #444; padding-bottom:10px; margin-bottom:10px;">
                <h4 style="margin:0; color:#888;">Soru ${index + 1}</h4>
                <div style="margin-top:10px; font-size:1.1rem;">${soruMetniGoster}</div>
            </div>
            
            <p style="color:${durumRengi}; font-size:1.1rem; margin-bottom:5px;">
                <strong>Sizin Cevabınız:</strong> ${durumMetni}
            </p>
            
            <p style="color:#00ff00; font-size:1.1rem; margin-bottom:10px;">
                <strong>Doğru Cevap:</strong> ${soru.siklar[dogruCevap]}
            </p>
            
            <div class="aciklama-kutusu" style="background:#111; padding:15px; border-radius:8px; border:1px solid #333; margin-top:10px;">
                <strong style="color:#ffff00; display:block; margin-bottom:5px;">💡 Açıklama:</strong> 
                <span style="color:#ddd;">${soru.aciklama}</span>
            </div>
        `;
        listeDiv.appendChild(kart);
    });

    baslik.focus();
}