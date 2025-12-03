// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;

// --- SES MOTORU (MP3 SİSTEMİ) ---
// Bu dosyaların (dogru.mp3, yanlis.mp3, bitis.mp3) ana klasörde olduğundan emin olun.
const sesler = {
    dogru: new Audio('dogru.mp3'),
    yanlis: new Audio('yanlis.mp3'),
    bitis: new Audio('bitis.mp3')
};

function sesUret(tur) {
    // Seslerin üst üste binmemesi için önce durdurup başa sarıyoruz
    if (sesler[tur]) {
        sesler[tur].pause();
        sesler[tur].currentTime = 0;
        // Tarayıcı izin verirse sesi çal
        sesler[tur].play().catch(e => console.log("Ses çalma hatası (otomatik oynatma izni gerekebilir):", e));
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

    // Uyarı kutusunu ve rolünü temizle (NVDA sıfırlaması)
    const uyariKutusu = document.getElementById("sesli-uyari");
    if(uyariKutusu) {
        uyariKutusu.innerText = "";
        uyariKutusu.removeAttribute("role");
    }
    
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
    
    // Soru İçeriği (Öncüllü/Normal)
    let finalHTML = "";

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
        finalHTML = metin;
    }

    soruBaslik.innerHTML = finalHTML;
    
    document.getElementById("soru-sayac").innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;
    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";
    
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
        const sikHarfi = getSikHarfi(i);
        btn.innerText = sikHarfi + ") " + sik;
        // NVDA için buton etiketi
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

    document.getElementById("btn-onceki").disabled = (index === 0);
    document.getElementById("btn-sonraki").disabled = (index === mevcutSorular.length - 1);

    if (kullaniciCevaplari[index] === null) soruBaslik.focus();
}

// --- CEVAP İŞARETLEME VE GERİ BİLDİRİM ---
function cevapIsaretle(secilenIndex, btnElement) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true;
    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    const dogruCevapIndex = mevcutSorular[mevcutSoruIndex].dogruCevap;
    const uyariKutusu = document.getElementById("sesli-uyari");
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    
    const sikHarfi = ["A", "B", "C", "D", "E"][secilenIndex];
    let durumMetni = "";

    if (secilenIndex === dogruCevapIndex) {
        btnElement.classList.add("dogru"); 
        sesUret("dogru"); // MP3 çal
        gorselUyari.innerText = "DOĞRU CEVAP!"; gorselUyari.classList.add("uyari-dogru"); gorselUyari.style.display = "block";
        durumMetni = "Doğru cevap.";
    } else {
        btnElement.classList.add("yanlis"); 
        sesUret("yanlis"); // MP3 çal
        gorselUyari.innerText = "YANLIŞ CEVAP!"; gorselUyari.classList.add("uyari-yanlis"); gorselUyari.style.display = "block";
        durumMetni = "Yanlış cevap.";
    }

    // --- NVDA VE MOBİL İÇİN KRİTİK DÜZELTME ---
    // 1. Önce içeriği ve rolü tamamen temizliyoruz.
    uyariKutusu.innerText = "";
    uyariKutusu.removeAttribute("role");
    
    // 2. Kısa bir süre sonra rolü 'alert' yapıp metni tek seferde basıyoruz.
    // Bu, ekran okuyucuyu "yeni bir uyarı geldi" diye dürtmek gibidir.
    setTimeout(() => {
        uyariKutusu.setAttribute("role", "alert"); 
        uyariKutusu.innerText = sikHarfi + " şıkkını işaretlediniz. " + durumMetni;
    }, 150);

    const tumButonlar = document.querySelectorAll(".sik-butonu");
    tumButonlar.forEach(b => b.disabled = true);

    setTimeout(() => {
        // Geçiş yaparken uyarıları temizle
        uyariKutusu.innerText = ""; 
        uyariKutusu.removeAttribute("role"); 
        gorselUyari.style.display = "none";
        
        if (mevcutSoruIndex < mevcutSorular.length - 1) { 
            sonrakiSoru(); 
        } 
        else {
             // Test Bittiğinde
             sesUret("bitis"); // MP3 çal
             
             // Bitiş uyarısını agresif şekilde okut
             setTimeout(() => {
                 uyariKutusu.setAttribute("role", "alert");
                 uyariKutusu.innerText = "Test bitti. Sonuçları görmek için bitir düğmesine basınız.";
             }, 100);
             
             gorselUyari.className = "gorsel-uyari-kutusu"; gorselUyari.style.display = "block";
             gorselUyari.style.backgroundColor = "#000"; gorselUyari.style.color = "#ffff00";
             gorselUyari.style.border = "2px solid #fff"; gorselUyari.innerText = "TEST BİTTİ";
             
             document.getElementById("bitir-buton").focus();
        }
    }, 2500); 
}

function getSikHarfi(index) { return ["A", "B", "C", "D", "E"][index]; }

// --- TEST BİTİRME VE SONUÇ ---
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
        <br>
        <button class="nav-buton" onclick="cevapAnahtariniGoster()" style="width:100%; padding:20px; font-size:1.2rem; border:2px solid #ffff00; color:#ffff00; background:#000;">📝 CEVAP ANAHTARI (Tüm Soruları İncele)</button>
    `;
    document.getElementById("puan-detay").innerHTML = sonucHTML;
    document.getElementById("sonuc-alani").focus();
}

// --- YENİ CEVAP ANAHTARI FONKSİYONU ---
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
        kart.className = "yanlis-soru-karti"; // Mevcut CSS stilini kullanır
        
        let durumRengi = "";
        let durumMetni = "";
        
        // Kullanıcının cevabına göre renklendirme
        if (kullaniciCevabi === null) {
            durumRengi = "#ffff00"; // Boş: Sarı
            durumMetni = "BOŞ BIRAKILDI";
            kart.style.borderLeft = "6px solid #ffff00";
        } else if (kullaniciCevabi === dogruCevap) {
            durumRengi = "#00ff00"; // Doğru: Yeşil
            durumMetni = soru.siklar[kullaniciCevabi] + " (DOĞRU)";
            kart.style.borderLeft = "6px solid #00ff00";
        } else {
            durumRengi = "#ff0000"; // Yanlış: Kırmızı
            durumMetni = soru.siklar[kullaniciCevabi] + " (YANLIŞ)";
            kart.style.borderLeft = "6px solid #ff0000";
        }

        // Soru metnini (öncüllü/normal) düzgün oluşturma
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