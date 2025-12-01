// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;

// --- SES EFEKTLERİ (URL TABANLI - GARANTİLİ) ---
// Not: Base64 kodları çok uzun olduğu için güvenilir CDN linkleri kullandım.
// Bunlar iPhone'da daha kararlı çalışır.

const sesler = {
    // Menü/Link Tıklama Sesi (Mekanik Klavye Sesi)
    tik: new Audio("https://cdn.freesound.org/previews/256/256116_4486188-lq.mp3"),
    
    // Doğru Cevap (Temiz 'Ding')
    dogru: new Audio("https://cdn.freesound.org/previews/171/171671_2437358-lq.mp3"),
    
    // Yanlış Cevap (Tok 'Bip')
    yanlis: new Audio("https://cdn.freesound.org/previews/142/142608_1840739-lq.mp3"),
    
    // Test Bitiş (Zafer)
    bitis: new Audio("https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3")
};

// Ses Seviyeleri (Ekran okuyucuyu bastırmasın)
sesler.tik.volume = 0.3;
sesler.dogru.volume = 0.6;
sesler.yanlis.volume = 0.5;
sesler.bitis.volume = 0.5;

// --- iPHONE SES ISITMA (Audio Warm-up) ---
// Sayfada herhangi bir yere ilk dokunuşta ses motorunu açar.
let sesMotoruHazir = false;
document.addEventListener('click', function() {
    if (!sesMotoruHazir) {
        // Tüm sesleri 0 saniyede sessizce çal ve durdur (Isıtma)
        Object.values(sesler).forEach(audio => {
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
            }).catch(() => {});
        });
        sesMotoruHazir = true;
    }
}, { once: true }); // Sadece bir kez çalışır

// --- GENEL TIKLAMA SESİ EKLEME ---
// Sayfadaki tüm buton ve linklere otomatik ses ekle
document.addEventListener("DOMContentLoaded", () => {
    const tumTiklanabilirler = document.querySelectorAll("a, button, summary");
    tumTiklanabilirler.forEach(elem => {
        elem.addEventListener("click", () => {
            // Eğer cevap butonu değilse 'tık' sesi çal (cevapların kendi sesi var)
            if (!elem.classList.contains("sik-butonu")) {
                sesler.tik.currentTime = 0;
                sesler.tik.play().catch(() => {});
            }
        });
    });
});

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
             soruAlani.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <h2>Test Bulunamadı</h2>
                    <a href="testler.html" class="aksiyon-butonu">Testlere Dön</a>
                </div>
            `;
            if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
        }
    }
});

function navigasyonButonlariniEkle() {
    const soruAlani = document.getElementById("soru-alani");
    if(document.querySelector(".navigasyon-alani")) return;

    const navDiv = document.createElement("div");
    navDiv.className = "navigasyon-alani";
    navDiv.innerHTML = `
        <button id="btn-onceki" class="nav-buton" onclick="oncekiSoru()">&lt; Önceki</button>
        <button id="btn-sonraki" class="nav-buton" onclick="sonrakiSoru()">Sonraki &gt;</button>
    `;
    soruAlani.appendChild(navDiv);
}

function oncekiSoru() {
    if (mevcutSoruIndex > 0) soruyuGoster(mevcutSoruIndex - 1);
}

function sonrakiSoru() {
    if (mevcutSoruIndex < mevcutSorular.length - 1) soruyuGoster(mevcutSoruIndex + 1);
}

function soruyuGoster(index) {
    // Temizlik
    const uyariKutusu = document.getElementById("sesli-uyari");
    if(uyariKutusu) uyariKutusu.innerText = "";
    
    // Görsel uyarı kutusunu gizle/temizle
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    if (gorselUyari) {
        gorselUyari.style.display = "none";
        gorselUyari.className = "gorsel-uyari-kutusu";
    }

    mevcutSoruIndex = index;
    const soruObj = mevcutSorular[index];
    isaretlemeKilitli = false; 
    
    document.getElementById("soru-metni").innerText = soruObj.soru;
    document.getElementById("soru-sayac").innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;

    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";

    // GÖRSEL UYARI ALANI YARAT (Eğer yoksa)
    if (!document.getElementById("gorsel-uyari-alani")) {
        const div = document.createElement("div");
        div.id = "gorsel-uyari-alani";
        div.className = "gorsel-uyari-kutusu";
        document.getElementById("soru-alani").appendChild(div);
    }

    soruObj.siklar.forEach((sik, i) => {
        const btn = document.createElement("button");
        btn.innerText = getSikHarfi(i) + ") " + sik;
        btn.className = "sik-butonu";
        
        if (kullaniciCevaplari[index] !== null) {
            if (kullaniciCevaplari[index] === i) {
                if (i === soruObj.dogruCevap) {
                    btn.classList.add("dogru");
                } else {
                    btn.classList.add("yanlis");
                }
            }
            btn.disabled = true;
        }

        btn.onclick = () => cevapIsaretle(i, btn);
        siklarKutusu.appendChild(btn);
    });

    document.getElementById("btn-onceki").disabled = (index === 0);
    document.getElementById("btn-sonraki").disabled = (index === mevcutSorular.length - 1);

    // Sadece cevaplanmamışsa odağı soruya ver
    if (kullaniciCevaplari[index] === null) {
        document.getElementById("soru-metni").focus();
    }
}

// --- CEVAP İŞARETLEME (SES + GÖRSEL + EKRAN OKUYUCU) ---
function cevapIsaretle(secilenIndex, btnElement) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true;

    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    const dogruCevapIndex = mevcutSorular[mevcutSoruIndex].dogruCevap;
    
    const uyariKutusu = document.getElementById("sesli-uyari"); // Ekran okuyucu için (Görünmez)
    const gorselUyari = document.getElementById("gorsel-uyari-alani"); // Görenler için (Görünür)
    
    if (secilenIndex === dogruCevapIndex) {
        // DOĞRU
        btnElement.classList.add("dogru");
        
        // 1. Ses Çal
        sesler.dogru.currentTime = 0;
        sesler.dogru.play().catch(() => {});

        // 2. Görsel Uyarı Göster (Masaüstü için)
        gorselUyari.innerText = "DOĞRU CEVAP!";
        gorselUyari.classList.add("uyari-dogru");
        gorselUyari.style.display = "block";

        // 3. Ekran Okuyucuya Gönder (Gecikmeli)
        setTimeout(() => { uyariKutusu.innerText = "Doğru Cevap!"; }, 200);

    } else {
        // YANLIŞ
        btnElement.classList.add("yanlis");
        
        // 1. Ses Çal
        sesler.yanlis.currentTime = 0;
        sesler.yanlis.play().catch(() => {});

        // 2. Görsel Uyarı Göster
        gorselUyari.innerText = "YANLIŞ CEVAP!";
        gorselUyari.classList.add("uyari-yanlis");
        gorselUyari.style.display = "block";

        // 3. Ekran Okuyucuya Gönder
        setTimeout(() => { uyariKutusu.innerText = "Yanlış Cevap!"; }, 200);
    }

    const tumButonlar = document.querySelectorAll(".sik-butonu");
    tumButonlar.forEach(b => b.disabled = true);

    // 2 SANİYE SONRA GEÇİŞ
    setTimeout(() => {
        // Geçmeden önce temizlik
        uyariKutusu.innerText = "";
        gorselUyari.style.display = "none";
        
        if (mevcutSoruIndex < mevcutSorular.length - 1) {
            sonrakiSoru();
        } else {
             sesler.bitis.play().catch(() => {});
             uyariKutusu.innerText = "Test bitti. Sonuçları görmek için bitir düğmesine basınız.";
             
             // Görsel uyarıyı değiştir
             gorselUyari.className = "gorsel-uyari-kutusu"; // Renkleri sıfırla
             gorselUyari.style.display = "block";
             gorselUyari.style.backgroundColor = "#000";
             gorselUyari.style.color = "#ffff00";
             gorselUyari.style.border = "2px solid #fff";
             gorselUyari.innerText = "TEST BİTTİ";
             
             document.getElementById("bitir-buton").focus();
        }
    }, 2000); 
}

function getSikHarfi(index) { return ["A", "B", "C", "D", "E"][index]; }

function testiBitir() {
    let dogruSayisi = 0;
    let yanlisSayisi = 0;
    let bosSayisi = 0;

    for (let i = 0; i < mevcutSorular.length; i++) {
        if (kullaniciCevaplari[i] === null) {
            bosSayisi++;
        } else if (kullaniciCevaplari[i] === mevcutSorular[i].dogruCevap) {
            dogruSayisi++;
        } else {
            yanlisSayisi++;
        }
    }

    const net = dogruSayisi - (yanlisSayisi / 4);
    let puan = net * 5;
    if (puan < 0) puan = 0;

    let motivasyonMesaji = "";
    let mesajRengi = "";

    if (puan >= 80) {
        motivasyonMesaji = "🏆 Mükemmel! Konuya son derece hakimsin.";
        mesajRengi = "#00ff00"; 
    } else if (puan >= 50) {
        motivasyonMesaji = "👍 Gayet iyisin! Biraz daha tekrarla harika olursun.";
        mesajRengi = "#ffff00"; 
    } else {
        motivasyonMesaji = "💪 Pes etmek yok! Tekrar yaparak başaracaksın.";
        mesajRengi = "#ff9999"; 
    }

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
            const kart = document.createElement("div");
            kart.className = "yanlis-soru-karti";
            
            let verilenCevapMetni = kullaniciCevabi !== null 
                ? soru.siklar[kullaniciCevabi] + " (YANLIŞ)" 
                : "BOŞ BIRAKILDI";

            kart.innerHTML = `
                <h4>Soru ${index + 1}: ${soru.soru}</h4>
                <p class="kirmizi-yazi"><strong>Sizin Cevabınız:</strong> ${verilenCevapMetni}</p>
                <p class="yesil-yazi"><strong>Doğru Cevap:</strong> ${soru.siklar[soru.dogruCevap]}</p>
                <div class="aciklama-kutusu">
                    <strong>Açıklama:</strong> ${soru.aciklama}
                </div>
            `;
            listeDiv.appendChild(kart);
        }
    });

    if (!yanlisVarMi) {
        listeDiv.innerHTML = "<p>Tebrikler! Hiç yanlışınız yok.</p>";
    }
    document.getElementById("yanlislar-baslik").focus();
}
