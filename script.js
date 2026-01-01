/**
 * EKPSS PROJESİ - SUPABASE SQL ENTEGRASYONLU TAM SCRIPT
 * Orijinal Sütun İsimleri (sorubankasi) ve Akıllı Navigasyon Aktif.
 */

// --- 1. BAĞLANTI VE DEĞİŞKENLER ---
const supabaseUrl = 'https://fiaqhmyeypypqtlfovhr.supabase.co';
const supabaseKey = 'sb_publishable_qe6IvL-AD4S69b5STp_lEw_zj2DCFb5';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let mevcutCozumIndex = 0; 
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;
let akilliGeriDonSayfasi = "index.html";

// Branş-Sayfa Eşleştirmesi (NVDA için doğru navigasyon sağlar)
const SAYFA_ESLESTIRME = {
    "cografya": "cografya.html",
    "cografyaiklim": "cografya.html",
    "cografyayersekilleri": "cografya.html",
    "cografyanufus": "cografya.html",
    "cografyaekonomik": "cografya.html",
    "cografyabolgeler": "cografya.html",
    "guncel": "guncel.html",
    "ilkturkislam": "testler.html", 
    "islamoncesi": "testler.html",
    "osmanlikultur": "testler.html",
    "osmanlikurulus": "testler.html",
    "osmanliyukselme": "testler.html",
    "osmanligerileme": "testler.html",
    "mesrutiyet": "testler.html",
    "inkilap": "testler.html",
    "cumhuriyet": "testler.html",
    "karma": "testler.html",
    "paragraf1": "turkce.html",
    "paragraf2": "turkce.html",
    "paragraf3": "turkce.html",
    "dilbilgisi": "turkce.html",
    "turkcekarisik": "turkce.html",
    "vatandaslik": "vatandaslik.html",
    "inkilapkarma": "testler.html",
    "trablusgarp": "testler.html"
};

// --- 2. SES MOTORU (BEKLE-KONUŞ MANTIĞI) ---
const sesler = {
    dogru: new Audio('dogru.mp3'),
    yanlis: new Audio('yanlis.mp3'),
    bitis: new Audio('bitis.mp3')
};

function sesUret(tur) {
    if (sesler[tur]) {
        sesler[tur].pause();
        sesler[tur].currentTime = 0;
        sesler[tur].play().catch(e => console.log("Ses hatası:", e));
    }
}

function sesCalBekle(tur) {
    return new Promise((resolve) => {
        if (sesler[tur]) {
            sesler[tur].pause();
            sesler[tur].currentTime = 0;
            sesler[tur].onended = () => resolve();
            sesler[tur].onerror = () => resolve();
            let playPromise = sesler[tur].play();
            if (playPromise !== undefined) {
                playPromise.catch(() => resolve());
            }
        } else { resolve(); }
    });
}

function metniOkuBekle(metin) {
    return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        let utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.4; 
        utterance.onend = () => { resolve(); };
        window.speechSynthesis.speak(utterance);
    });
}

// --- 3. TEST YÜKLEME (SORUBANKASI TABLOSU) ---
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const testParam = urlParams.get('id'); 
    
    if (testParam) {
        const parcalar = testParam.split('_test');
        const konuAnahtari = parcalar[0];
        const testNo = parseInt(parcalar[1]);

        akilliGeriDonSayfasi = SAYFA_ESLESTIRME[konuAnahtari] || "index.html"; 

        if (konuAnahtari && !isNaN(testNo)) {
            testiYukle(konuAnahtari, testNo);
            
            // Branş bazlı geri dönüş butonlarını ayarlar
            setTimeout(() => {
                const ustGeri = document.getElementById("ust-geri-link");
                const yeniTestSec = document.getElementById("yeni-test-sec-butonu");
                if (ustGeri) ustGeri.href = akilliGeriDonSayfasi;
                if (yeniTestSec) yeniTestSec.href = akilliGeriDonSayfasi;
            }, 100);
        } else {
            hataGoster("Test ID formatı hatalı.");
        }
    }
});

async function testiYukle(konuAnahtari, testNo) {
    try {
        // Tablo Adı: sorubankasi | Sütun: soru_sayisi
        const { data, error } = await supabaseClient
            .from('sorular') 
            .select('*')
            .eq('alt_baslik_id', konuAnahtari)
            .eq('soru_sayisi', testNo) 
            .order('id', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            mevcutSorular = data;
            kullaniciCevaplari = new Array(mevcutSorular.length).fill(null);
            navigasyonButonlariniEkle();
            soruyuGoster(0);
        } else {
            hataGoster("Veritabanında bu teste ait soru bulunamadı.");
        }
    } catch (err) {
        console.error("SQL Hatası:", err);
        hataGoster("Veritabanı bağlantısında bir hata oluştu.");
    }
}

function hataGoster(mesaj) {
    const soruAlani = document.getElementById("soru-alani");
    if(soruAlani) {
        soruAlani.innerHTML = `<div style="text-align:center; padding:20px;"><h2 style="color:#ffcc00;">⚠️ Hata</h2><p>${mesaj}</p><a href="index.html" class="aksiyon-butonu">Listeye Dön</a></div>`;
    }
}

// --- 4. SORU GÖSTERİMİ VE ERİŞİLEBİLİRLİK ---
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
    window.scrollTo({ top: 0, behavior: 'auto' });
    mevcutSoruIndex = index;
    const soruObj = mevcutSorular[index];
    isaretlemeKilitli = false; 

    const soruSayacElement = document.getElementById("soru-sayac");
    soruSayacElement.innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;
    soruSayacElement.setAttribute("tabindex", "-1");

    const soruBaslik = document.getElementById("soru-metni");
    let finalHTML = "";
    let toplamMetinKontrol = ""; 

    // Görsel Betimleme (Zorunlu)
    if (soruObj.gorsel_metin && soruObj.gorsel_metin !== "HÜKÜMSÜZ") {
        finalHTML += `<div class="sr-only"><strong>Betimleme:</strong> ${soruObj.gorsel_metin}</div>`;
    }

    // Öncül
    if (soruObj.oncul && soruObj.oncul !== "HÜKÜMSÜZ") {
        finalHTML += `<div class="oncul-kapsayici">${soruObj.oncul}</div>`;
        toplamMetinKontrol += soruObj.oncul;
    }

    // Soru Kökü
    finalHTML += `<p class="soru-ana-metin">${soruObj.soru_koku}</p>`;
    toplamMetinKontrol += soruObj.soru_koku;

    // Uzun Soru CSS Kontrolü
    const container = document.querySelector(".container");
    if (toplamMetinKontrol.length > 250) container.classList.add("uzun-soru");
    else container.classList.remove("uzun-soru");

    soruBaslik.innerHTML = finalHTML;

    // Şıklar (Dizi formatı: siklar)
    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";
    
    soruObj.siklar.forEach((sikMetni, i) => { 
        const btn = document.createElement("button");
        const harf = ["A", "B", "C", "D", "E"][i];
        btn.innerText = harf + ") " + sikMetni;
        btn.className = "sik-butonu";
        btn.setAttribute("aria-label", `${harf} şıkkı: ${sikMetni}`); 

        if (kullaniciCevaplari[index] !== null) {
            if (harf === ["A", "B", "C", "D", "E"][kullaniciCevaplari[index]]) {
                btn.classList.add(harf === soruObj.dogru_cevap ? "dogru" : "yanlis");
            }
            btn.disabled = true;
        }
        btn.onclick = () => cevapIsaretle(i, btn);
        siklarKutusu.appendChild(btn);
    });

    document.getElementById("btn-onceki").disabled = (index === 0);
    document.getElementById("btn-sonraki").disabled = (index === mevcutSorular.length - 1);
    setTimeout(() => { soruSayacElement.focus(); }, 100);
}

// --- 5. CEVAPLAMA VE SESLİ GERİ BİLDİRİM ---
async function cevapIsaretle(secilenIndex, btn) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true; 
    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    
    const harf = ["A", "B", "C", "D", "E"][secilenIndex];
    const dogruHarf = mevcutSorular[mevcutSoruIndex].dogru_cevap; 
    const dogruMu = (harf === dogruHarf);
    const dogruMetin = mevcutSorular[mevcutSoruIndex].siklar[["A","B","C","D","E"].indexOf(dogruHarf)];

    if (dogruMu) btn.classList.add("dogru");
    else {
        btn.classList.add("yanlis");
        document.querySelectorAll(".sik-butonu").forEach(b => {
            if(b.innerText.startsWith(dogruHarf + ")")) b.classList.add("dogru");
        });
    }

    let msg = dogruMu ? `Doğru! Cevap ${harf}.` : `Yanlış. Doğru cevap ${dogruHarf}, ${dogruMetin}.`;
    
    await sesCalBekle(dogruMu ? 'dogru' : 'yanlis');
    await metniOkuBekle(msg);

    if (mevcutSoruIndex < mevcutSorular.length - 1) sonrakiSoru();
    else testiBitir();
}

// --- 6. CEVAP ANAHTARI (Sütun: aciklama) ---
function testiBitir() {
    sesUret('bitis'); 
    let d = 0, y = 0, b = 0;
    mevcutSorular.forEach((soru, i) => {
        const secilen = kullaniciCevaplari[i] !== null ? ["A", "B", "C", "D", "E"][kullaniciCevaplari[i]] : null;
        if (secilen === null) b++;
        else if (secilen === soru.dogru_cevap) d++;
        else y++;
    });
    
    document.getElementById("soru-alani").style.display = "none";
    document.getElementById("sonuc-alani").style.display = "block";
    document.getElementById("puan-detay").innerHTML = `
        <div style="border: 4px solid #fff; padding: 20px; border-radius: 10px; background:#000; margin-bottom:20px;">
            <p style="font-size:1.5rem; color:#fff;"><strong>PUAN: ${( (d - y/4)*5 < 0 ? 0 : (d-y/4)*5 ).toFixed(2)}</strong></p>
            <p>D: ${d} | Y: ${y} | B: ${b}</p>
        </div>
        <button class="nav-buton" onclick="cevapAnahtariniGoster()" style="width:100%;">📝 DETAYLI ANALİZ</button>
        <a href="${akilliGeriDonSayfasi}" class="nav-buton" style="display:block; text-align:center; margin-top:10px;">Listeye Dön</a>
    `;
}

function cevapAnahtariniGoster() {
    const testParam = new URLSearchParams(window.location.search).get('id');
    const isTurkish = testParam && testParam.startsWith('paragraf'); 
    let container = document.getElementById("cevap-anahtari-konteyner") || document.createElement("div");
    container.id = "cevap-anahtari-konteyner";
    document.getElementById("sonuc-alani").appendChild(container);
    container.innerHTML = `<h2 style="color:#ffff00; text-align:center; margin-top:20px;">ÇÖZÜMLER VE ANALİZ</h2>`;

    if (isTurkish) {
        mevcutCozumIndex = 0;
        gosterTurkceCozum(mevcutCozumIndex, container);
    } else {
        mevcutSorular.forEach((soru, index) => {
            const secilenIndex = kullaniciCevaplari[index];
            const secilenHarf = secilenIndex !== null ? ["A", "B", "C", "D", "E"][secilenIndex] : "BOŞ";
            const kart = document.createElement("div");
            kart.style.cssText = "border:1px solid #444; padding:15px; margin-top:15px; background:#222; border-radius:8px;";
            kart.innerHTML = `
                <h3 style="color:#fff;">Soru ${index + 1}</h3>
                <p style="color:${secilenHarf === soru.dogru_cevap ? '#00ff00' : '#ff4444'}">
                    <strong>Senin Cevabın:</strong> ${secilenHarf} | <strong>Doğru:</strong> ${soru.dogru_cevap}
                </p>
                <div style="background:#333; padding:10px; border-left:4px solid #ffff00; margin-top:10px; color:#ddd;">
                    <strong>💡 Çözüm:</strong><br>${soru.aciklama || "Açıklama bulunmuyor."}
                </div>`;
            container.appendChild(kart);
        });
    }
    container.scrollIntoView({ behavior: 'smooth' });
}

// Türkçe Paragraf Soruları İçin Tekli Çözüm Modu
function gosterTurkceCozum(index, container) {
    container.innerHTML = "";
    const soru = mevcutSorular[index];
    const secilenIndex = kullaniciCevaplari[index];
    const secilenHarf = secilenIndex !== null ? ["A", "B", "C", "D", "E"][secilenIndex] : "BOŞ";
    
    const kart = document.createElement("div");
    kart.style.cssText = "border:1px solid #444; padding:20px; background:#222; border-radius:8px; margin-top:20px;";
    kart.innerHTML = `
        <h3 style="color:#ffff00; margin-bottom:15px;" tabindex="0">Soru ${index + 1} Çözümü</h3>
        <p style="font-weight:bold; color:${secilenHarf === soru.dogru_cevap ? '#00ff00' : '#ff4444'}">
            Cevabınız: ${secilenHarf} / Doğru Cevap: ${soru.dogru_cevap}
        </p>
        <div style="background:#111; padding:15px; border-left:5px solid #00ff00; margin-top:15px;">
            <strong style="color:#00ff00;">💡 Detaylı Analiz:</strong><br><br>${soru.aciklama || "Açıklama eklenmemiş."}
        </div>
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button class="nav-buton" style="flex:1" onclick="gosterTurkceCozum(${index-1}, document.getElementById('cevap-anahtari-konteyner'))" ${index===0?'disabled':''}>Geri</button>
            <button class="nav-buton" style="flex:1" onclick="${index < mevcutSorular.length-1 ? `gosterTurkceCozum(${index+1}, document.getElementById('cevap-anahtari-konteyner'))` : 'location.reload()'}">${index < mevcutSorular.length-1 ? 'Sonraki Çözüm' : 'Testi Kapat'}</button>
        </div>`;
    container.appendChild(kart);
    kart.querySelector('h3').focus();
}