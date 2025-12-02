// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;

// --- SES MOTORU ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const sesMotoru = new AudioContext();

function motoruUyandir() { if (sesMotoru.state === 'suspended') sesMotoru.resume(); }
document.addEventListener('click', motoruUyandir);
document.addEventListener('touchstart', motoruUyandir);

function sesUret(tur) {
    motoruUyandir(); 
    const osilator = sesMotoru.createOscillator();
    const kazanc = sesMotoru.createGain();
    osilator.connect(kazanc);
    kazanc.connect(sesMotoru.destination);
    const suan = sesMotoru.currentTime;

    if (tur === "dogru") {
        osilator.type = "sine"; osilator.frequency.setValueAtTime(600, suan);
        osilator.frequency.exponentialRampToValueAtTime(1200, suan + 0.1);
        kazanc.gain.setValueAtTime(0.2, suan); kazanc.gain.exponentialRampToValueAtTime(0.01, suan + 0.5);
        osilator.start(suan); osilator.stop(suan + 0.5);
    } 
    else if (tur === "yanlis") {
        osilator.type = "triangle"; osilator.frequency.setValueAtTime(150, suan);
        osilator.frequency.linearRampToValueAtTime(100, suan + 0.2);
        kazanc.gain.setValueAtTime(0.2, suan); kazanc.gain.linearRampToValueAtTime(0.01, suan + 0.3);
        osilator.start(suan); osilator.stop(suan + 0.3);
    } 
    else if (tur === "bitis") {
        notaCal(523.25, suan, 0.2); notaCal(659.25, suan + 0.2, 0.2); notaCal(783.99, suan + 0.4, 0.6);
    }
}

function notaCal(freq, time, dur) {
    const osc = sesMotoru.createOscillator(); const gn = sesMotoru.createGain();
    osc.type = "sine"; osc.frequency.value = freq; osc.connect(gn); gn.connect(sesMotoru.destination);
    gn.gain.setValueAtTime(0.1, time); gn.gain.exponentialRampToValueAtTime(0.01, time + dur);
    osc.start(time); osc.stop(time + dur);
}

// --- GÜVENLİ VE AKILLI METİN FORMATLAYICI ---
function metniFormatla(metin) {
    if (!metin) return "";

    // GÜVENLİK KİLİDİ:
    // Eğer içinde "I.", "II." veya " 1.", " 2." (boşluklu) YOKSA dokunma!
    // Bu sayede "Aşağıdakilerden hangisi..." gibi düz sorular bozulmaz.
    const maddeVarMi = metin.match(/ I\.| II\.| III\.| 1\.| 2\.| 3\./);
    if (!maddeVarMi) {
        return metin; // Madde yoksa olduğu gibi gönder
    }

    // Madde Varsa İşlemlere Başla:
    let yeniMetin = metin;

    // 1. Maddeleri Alt Alta Al
    yeniMetin = yeniMetin
        .replace(/ I\./g, "<br><span class='oncul-maddesi'>I.")
        .replace(/ II\./g, "<br><span class='oncul-maddesi'>II.")
        .replace(/ III\./g, "<br><span class='oncul-maddesi'>III.")
        .replace(/ IV\./g, "<br><span class='oncul-maddesi'>IV.")
        .replace(/ 1\./g, "<br><span class='oncul-maddesi'>1.")
        .replace(/ 2\./g, "<br><span class='oncul-maddesi'>2.")
        .replace(/ 3\./g, "<br><span class='oncul-maddesi'>3.")
        .replace(/ 4\./g, "<br><span class='oncul-maddesi'>4.");

    // 2. Soru Kökünü (Buna göre...) Ayır ve Vurgula
    // Sadece belli kelimeleri yakalar
    const soruKokleri = ["Buna göre", "Bu bilgilere göre", "Yukarıdaki", "Aşağıdaki", "Hangisi"];
    
    soruKokleri.forEach(kok => {
        // Eğer kök kelime maddelerden SONRA geliyorsa (cümlenin sonlarına doğru)
        if (yeniMetin.includes(kok)) {
            // Soru kökünün başladığı yeri bul ve oradan öncesine boşluk, kendisine stil ekle
            // Basitçe o kelimeyi yakalayıp değişim yapıyoruz
            // Dikkat: "Aşağıdakilerden" cümlenin başındaysa dokunmasın diye kontrol edebiliriz ama
            // zaten yukarıdaki "maddeVarMi" kontrolü bunu engelliyor.
            
            yeniMetin = yeniMetin.replace(kok, `<br><br><span class='soru-koku-vurgu'>${kok}`);
        }
    });

    return yeniMetin;
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

function soruyuGoster(index) {
    const uyariKutusu = document.getElementById("sesli-uyari");
    if(uyariKutusu) uyariKutusu.innerText = "";
    
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    if (gorselUyari) gorselUyari.style.display = "none";

    mevcutSoruIndex = index;
    const soruObj = mevcutSorular[index];
    isaretlemeKilitli = false; 
    
    const soruBaslik = document.getElementById("soru-metni");
    soruBaslik.innerHTML = metniFormatla(soruObj.soru); // FORMATLAYICI BURADA
    
    document.getElementById("soru-sayac").innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;
    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";

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

function cevapIsaretle(secilenIndex, btnElement) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true;
    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    const dogruCevapIndex = mevcutSorular[mevcutSoruIndex].dogruCevap;
    const uyariKutusu = document.getElementById("sesli-uyari");
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    
    if (secilenIndex === dogruCevapIndex) {
        btnElement.classList.add("dogru"); sesUret("dogru");
        gorselUyari.innerText = "DOĞRU CEVAP!"; gorselUyari.classList.add("uyari-dogru"); gorselUyari.style.display = "block";
        setTimeout(() => { uyariKutusu.innerText = "Doğru Cevap!"; }, 300);
    } else {
        btnElement.classList.add("yanlis"); sesUret("yanlis");
        gorselUyari.innerText = "YANLIŞ CEVAP!"; gorselUyari.classList.add("uyari-yanlis"); gorselUyari.style.display = "block";
        setTimeout(() => { uyariKutusu.innerText = "Yanlış Cevap!"; }, 300);
    }

    const tumButonlar = document.querySelectorAll(".sik-butonu");
    tumButonlar.forEach(b => b.disabled = true);

    setTimeout(() => {
        uyariKutusu.innerText = ""; gorselUyari.style.display = "none";
        if (mevcutSoruIndex < mevcutSorular.length - 1) { sonrakiSoru(); } 
        else {
             sesUret("bitis");
             uyariKutusu.innerText = "Test bitti. Sonuçları görmek için bitir düğmesine basınız.";
             gorselUyari.className = "gorsel-uyari-kutusu"; gorselUyari.style.display = "block";
             gorselUyari.style.backgroundColor = "#000"; gorselUyari.style.color = "#ffff00";
             gorselUyari.style.border = "2px solid #fff"; gorselUyari.innerText = "TEST BİTTİ";
             document.getElementById("bitir-buton").focus();
        }
    }, 2000); 
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
            let verilenCevapMetni = kullaniciCevabi !== null ? soru.siklar[kullaniciCevabi] + " (YANLIŞ)" : "BOŞ BIRAKILDI";
            kart.innerHTML = `<h4>Soru ${index + 1}: ${metniFormatla(soru.soru)}</h4><p class="kirmizi-yazi"><strong>Sizin Cevabınız:</strong> ${verilenCevapMetni}</p><p class="yesil-yazi"><strong>Doğru Cevap:</strong> ${soru.siklar[soru.dogruCevap]}</p><div class="aciklama-kutusu"><strong>Açıklama:</strong> ${soru.aciklama}</div>`;
            listeDiv.appendChild(kart);
        }
    });
    if (!yanlisVarMi) { listeDiv.innerHTML = "<p>Tebrikler! Hiç yanlışınız yok.</p>"; }
    document.getElementById("yanlislar-baslik").focus();
}