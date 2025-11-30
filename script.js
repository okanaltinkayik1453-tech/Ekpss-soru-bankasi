// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;

// --- SES EFEKTLERİ (HAFİF, KISA VE YUMUŞAK) ---
// Base64 formatı sayesinde internet olmasa da çalışır, dosya indirtmez.

// Doğru Sesi: Kısa, yumuşak bir "Ping"
const SES_DOGRU_SRC = "data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"; 
// (Not: Gerçek kod çok uzun olduğu için burada kısa Google sesini kullanıyorum, daha temiz)
const audioDogru = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg");
audioDogru.volume = 0.4; // Sesi kıstık (Çakışmayı önler)

// Yanlış Sesi: Hafif, tok bir "Tık"
const audioYanlis = new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
audioYanlis.volume = 0.3; // Sesi kıstık

// Bitiş Sesi: Kısa başarı efekti
const audioBitis = new Audio("https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg");
audioBitis.volume = 0.4;

// --- SAYFA YÜKLENDİĞİNDE ÇALIŞIR ---
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const testID = urlParams.get('id');

    if (testID && typeof tumTestler !== 'undefined' && tumTestler[testID]) {
        mevcutSorular = tumTestler[testID];
        kullaniciCevaplari = new Array(mevcutSorular.length).fill(null);
        
        // Navigasyon Butonlarını Ekle (HTML'de yoksa yarat)
        navigasyonButonlariniEkle();
        
        soruyuGoster(0);
    } else {
        const soruAlani = document.getElementById("soru-alani");
        if(soruAlani) {
             soruAlani.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <h2>Test Bulunamadı</h2>
                    <a href="testler.html" class="aksiyon-butonu" style="border:2px solid #fff; padding:10px;">Testlere Dön</a>
                </div>
            `;
            if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
        }
    }
});

// --- NAVİGASYON BUTONLARINI OLUŞTURMA ---
function navigasyonButonlariniEkle() {
    const soruAlani = document.getElementById("soru-alani");
    // Zaten varsa ekleme
    if(document.querySelector(".navigasyon-alani")) return;

    const navDiv = document.createElement("div");
    navDiv.className = "navigasyon-alani";
    navDiv.innerHTML = `
        <button id="btn-onceki" class="nav-buton" onclick="oncekiSoru()">&lt; Önceki Soru</button>
        <button id="btn-sonraki" class="nav-buton" onclick="sonrakiSoru()">Sonraki Soru &gt;</button>
    `;
    // Şıkların hemen altına, bitir butonunun üstüne ekle
    soruAlani.appendChild(navDiv);
}

// --- ÖNCEKİ / SONRAKİ FONKSİYONLARI ---
function oncekiSoru() {
    if (mevcutSoruIndex > 0) {
        soruyuGoster(mevcutSoruIndex - 1);
    }
}

function sonrakiSoru() {
    if (mevcutSoruIndex < mevcutSorular.length - 1) {
        soruyuGoster(mevcutSoruIndex + 1);
    }
}

// --- SORUYU GÖSTERME ---
function soruyuGoster(index) {
    mevcutSoruIndex = index;
    const soruObj = mevcutSorular[index];
    isaretlemeKilitli = false; 
    
    // Sesli uyarıyı temizle
    const uyariKutusu = document.getElementById("sesli-uyari");
    if(uyariKutusu) uyariKutusu.innerText = ""; 

    // Soru Metni
    document.getElementById("soru-metni").innerText = soruObj.soru;
    document.getElementById("soru-sayac").innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;

    // Şıklar
    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";

    soruObj.siklar.forEach((sik, i) => {
        const btn = document.createElement("button");
        btn.innerText = getSikHarfi(i) + ") " + sik;
        btn.className = "sik-butonu";
        
        // Daha önce cevaplanmışsa
        if (kullaniciCevaplari[index] !== null) {
            if (kullaniciCevaplari[index] === i) {
                if (i === soruObj.dogruCevap) {
                    btn.classList.add("dogru");
                } else {
                    btn.classList.add("yanlis");
                }
            }
            btn.disabled = true; // Değiştirilemesin
        }

        btn.onclick = () => cevapIsaretle(i, btn);
        siklarKutusu.appendChild(btn);
    });

    // Buton Durumlarını Güncelle
    document.getElementById("btn-onceki").disabled = (index === 0);
    document.getElementById("btn-sonraki").disabled = (index === mevcutSorular.length - 1);

    // Otomatik Geçişi İptal Et (Kullanıcı butonları kullanabilir)
    // Sadece cevap verilmemişse odağı soruya ver
    if (kullaniciCevaplari[index] === null) {
        document.getElementById("soru-metni").focus();
    }
}

// --- CEVAP İŞARETLEME (SESLİ + GÖRSEL) ---
function cevapIsaretle(secilenIndex, btnElement) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true;

    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    const dogruCevapIndex = mevcutSorular[mevcutSoruIndex].dogruCevap;
    
    const uyariKutusu = document.getElementById("sesli-uyari");
    
    if (secilenIndex === dogruCevapIndex) {
        // DOĞRU
        btnElement.classList.add("dogru");
        
        // 1. Önce Sesi Çal
        audioDogru.currentTime = 0;
        audioDogru.play().catch(() => {}); // Hata olursa yoksay
        
        // 2. Çok kısa bekle, sonra okuyucuya metni ver (Çakışma önleyici)
        setTimeout(() => {
            uyariKutusu.innerText = "Doğru Cevap!";
        }, 300);

    } else {
        // YANLIŞ
        btnElement.classList.add("yanlis");
        
        // 1. Sesi Çal
        audioYanlis.currentTime = 0;
        audioYanlis.play().catch(() => {});
        
        // 2. Metni ver
        setTimeout(() => {
            uyariKutusu.innerText = "Yanlış Cevap!";
        }, 300);
    }

    // Diğer şıkları kilitle
    const tumButonlar = document.querySelectorAll(".sik-butonu");
    tumButonlar.forEach(b => b.disabled = true);

    // 2 SANİYE SONRA OTOMATİK GEÇİŞ
    setTimeout(() => {
        if (mevcutSoruIndex < mevcutSorular.length - 1) {
            sonrakiSoru();
        } else {
             // Test Bitti
             audioBitis.play().catch(() => {});
             uyariKutusu.innerText = "Test bitti. Sonuçları görmek için bitir düğmesine basınız.";
             document.getElementById("bitir-buton").focus();
        }
    }, 2000); 
}

function getSikHarfi(index) { return ["A", "B", "C", "D", "E"][index]; }

// --- TESTİ BİTİR ---
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

    // MOTİVASYON MESAJI
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
        <div style="border: 2px solid #fff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color:${mesajRengi}; font-size: 1.5rem; margin: 0 0 10px 0;">${motivasyonMesaji}</h3>
        </div>
        <p><strong>TOPLAM PUAN: ${puan.toFixed(2)} / 100</strong></p>
        <p>Doğru: ${dogruSayisi} | Yanlış: ${yanlisSayisi} | Boş: ${bosSayisi}</p>
        <p>Net: ${net.toFixed(2)}</p>
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
