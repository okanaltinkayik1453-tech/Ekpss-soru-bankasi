// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;

// --- SES MOTORU (PC AYARLARI KORUNDU - MP3 SİSTEMİ) ---
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

    const soruBaslik = document.getElementById("soru-metni");
    
    // --- AKILLI İÇERİK OLUŞTURUCU ---
    let finalHTML = "";

    // EĞER SORU PARÇALANMIŞ (YENİ TİP) İSE:
    if (soruObj.onculler && soruObj.onculler.length > 0) {
        
        // 1. Giriş Metni (Varsa)
        if (soruObj.onculGiris) {
            finalHTML += `<div>${soruObj.onculGiris}</div>`;
        }

        // 2. Öncül Kutusu (Sarı Çizgili Alan)
        finalHTML += `<div class='oncul-kapsayici'>`;
        soruObj.onculler.forEach(oncul => {
            // Numarayı (1. veya I.) ve metni ayıklamaya çalış, yoksa düz bas
            // Genelde format: "1. Metin"
            let numara = oncul.split(" ")[0]; // İlk kelimeyi numara say
            let metin = oncul.substring(numara.length).trim();
            
            finalHTML += `
                <div class='oncul-satir'>
                    <span class='oncul-no'>${numara}</span>
                    <span class='oncul-yazi'>${metin}</span>
                </div>`;
        });
        finalHTML += `</div>`;

        // 3. Soru Kökü (Koyu ve Sarı)
        if (soruObj.soruKoku) {
            finalHTML += `<div class='soru-koku-vurgu'>${soruObj.soruKoku}</div>`;
        }

    } 
    // EĞER SORU ESKİ TİP (DÜZ METİN) İSE:
    else {
        // Eski soruların bozulmaması için düz yazdır
        let metin = soruObj.soru || "";
        finalHTML = metin;
    }

    soruBaslik.innerHTML = finalHTML;
    
    document.getElementById("soru-sayac").innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;
    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";
    
    // Uzun şık kontrolü
    const uzunSikVar = soruObj.siklar.some(sik => sik.length > 40);
    if (uzunSikVar) siklarKutusu.classList.add("tek-sutun");
    else siklarKutusu.classList.remove("tek-sutun");

    if (!document.getElementById("gorsel-uyari-alani")) {
        const div = document.createElement("div");
        div.id = "gorsel-uyari-alani"; div.className = "gorsel-uyari-kutusu";
        document.getElementById("soru-alani").appendChild(div);
    }

    soruObj.siklar.forEach((sik, i) => {
        const btn = document.createElement("button");
        btn.innerText = getSikHarfi(i) + ") " + sik;
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

    document.getElementById("btn-onceki").disabled = (index === 0);
    document.getElementById("btn-sonraki").disabled = (index === mevcutSorular.length - 1);

    if (kullaniciCevaplari[index] === null) soruBaslik.focus();
}

// --- CEVAP İŞARETLEME (PC: ARIA-LIVE EKLENDİ, MOBİL: ÇİFT OKUMA KALDIRILDI) ---
function cevapIsaretle(secilenIndex, btnElement) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true;
    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    const dogruCevapIndex = mevcutSorular[mevcutSoruIndex].dogruCevap;
    const uyariKutusu = document.getElementById("sesli-uyari");
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    
    const sikHarfi = ["A", "B", "C", "D", "E"][secilenIndex];
    let durumMetniDetayli = ""; 
    let durumMetniKisa = ""; 

    // --- CİHAZ TESPİTİ ---
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    // --- GÖRSEL VE DURUM AYARLARI ---
    const gorselMetin = (secilenIndex === dogruCevapIndex) ? "DOĞRU CEVAP!" : "YANLIŞ CEVAP!";
    const gorselClass = (secilenIndex === dogruCevapIndex) ? "uyari-dogru" : "uyari-yanlis";
    
    gorselUyari.innerText = gorselMetin;
    gorselUyari.className = "gorsel-uyari-kutusu " + gorselClass;
    gorselUyari.style.display = "block";

    if (secilenIndex === dogruCevapIndex) {
        btnElement.classList.add("dogru"); 
        durumMetniDetayli = "Doğru cevap."; 
        durumMetniKisa = "Doğru cevap."; 
    } else {
        btnElement.classList.add("yanlis"); 
        durumMetniDetayli = "Yanlış cevap."; 
        durumMetniKisa = "Yanlış cevap."; 
    }

    // --- PC/MOBİL ANNOUNCEMENT AYRIMI ---

    if (!isMobile) {
        // PC AYARI DÜZELTİLDİ: NVDA'nın okumasını sağlayan ARIA-LIVE eklendi.
        uyariKutusu.setAttribute("role", "alert"); 
        uyariKutusu.setAttribute("aria-live", "assertive"); 
        
        sesUret(secilenIndex === dogruCevapIndex ? "dogru" : "yanlis"); 
        // Metin okuma ayarı korundu
        uyariKutusu.innerText = sikHarfi + " şıkkını işaretlediniz. " + durumMetniDetayli;
    } 
    else {
        // MOBİL AYARI DÜZELTİLDİ: Çift okumayı engeller, sadece sonucu söyler.
        setTimeout(() => { 
             // 350ms bekleyip sadece sonucu bir kez söyler.
             uyariKutusu.innerText = durumMetniKisa; 
        }, 350); 
    }

    // --- GENEL ZAMANLAMA VE GEÇİŞ ---
    const toplamGecisSuresi = isMobile ? 1350 : 2500; 

    const tumButonlar = document.querySelectorAll(".sik-butonu");
    tumButonlar.forEach(b => b.disabled = true);

    setTimeout(() => {
        // PC için eklenen ARIA-LIVE ayarları temizlenir.
        uyariKutusu.innerText = ""; 
        uyariKutusu.removeAttribute("role"); 
        uyariKutusu.removeAttribute("aria-live");
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
    `;
    document.getElementById("puan-detay").innerHTML = sonucHTML;
    document.getElementById("sonuc-alani").focus();
}

function yanlislariGoster() {
    const listeDiv = document.getElementById("yanlis-detaylari");
    listeDiv.innerHTML = "";
    document.getElementById("yanlislar-listesi").style.display = "block";
    let yanlisVarMi = false;
    mevcutSorular.forEach((soru, index) => {
        const kullaniciCevabi = kullaniciCevaplari[index];
        if (kullaniciCevabi !== soru.dogruCevap) {
            yanlisVarMi = true;
            const kart = document.createElement("div"); kart.className = "yanlis-soru-karti";
            
            // YANLIŞLARI GÖSTERİRKEN DE YAPIYI KORU
            let soruMetniGoster = "";
            if (soru.onculler) {
                if(soru.onculGiris) soruMetniGoster += soru.onculGiris + "<br>";
                soru.onculler.forEach(o => soruMetniGoster += o + "<br>");
                if(soru.soruKoku) soruMetniGoster += "<strong>" + soru.soruKoku + "</strong>";
            } else {
                soruMetniGoster = soru.soru;
            }

            let verilenCevapMetni = kullaniciCevabi !== null ? soru.siklar[kullaniciCevabi] + " (YANLIŞ)" : "BOŞ BIRAKILDI";
            kart.innerHTML = `<h4>Soru ${index + 1}: ${soruMetniGoster}</h4><p class="kirmizi-yazi"><strong>Sizin Cevabınız:</strong> ${verilenCevapMetni}</p><p class="yesil-yazi"><strong>Doğru Cevap:</strong> ${soru.siklar[soru.dogruCevap]}</p><div class="aciklama-kutusu"><strong>Açıklama:</strong> ${soru.aciklama}</div>`;
            listeDiv.appendChild(kart);
        }
    });
    if (!yanlisVarMi) { listeDiv.innerHTML = "<p>Tebrikler! Hiç yanlışınız yok.</p>"; }
    document.getElementById("yanlislar-baslik").focus();
}