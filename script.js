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

// Körcül dostu temizleme fonksiyonu
function metniTemizle(metin) {
    if (!metin) return "";
    // 1. "eA şıkkı:", "A şıkkı:" gibi her türlü ön eki siler
    let sonuc = metin.replace(/.*[A-E]\s?şıkkı:?\s*/i, "");
    // 2. Kalan kısımdaki "A)" veya "A." gibi işaretleri siler
    sonuc = sonuc.replace(/^[A-E][\).]\s*/i, "");
    return sonuc.trim();
}
// --- 2. SES MOTORU VE ÖNBELLEKLEME ---
async function sesleriOnbellegeAl() {
    const sesDosyalari = ['dogru.mp3', 'yanlis.mp3', 'bitis.mp3'];
    try {
        const cache = await caches.open('ekpss-ses-onbellegi');
        for (const ses of sesDosyalari) {
            const response = await cache.match(ses);
            if (!response) {
                await cache.add(ses);
                console.log(ses + " önbelleğe alındı.");
            }
        }
    } catch (e) {
        console.log("Önbellekleme hatası:", e);
    }
}

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
        // NVDA ve tarayıcı çakışmasını önlemek için önceki sesleri durdur ama tamamen iptal etme
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
        
        let utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.4;

        // Emniyet Kemeri: Ses motoru takılırsa 5 saniye sonra zorla sonraki soruya geç
        const emniyetZamanlayici = setTimeout(() => {
            resolve();
        }, 5000);

        utterance.onend = () => {
            clearTimeout(emniyetZamanlayici);
            resolve();
        };

        utterance.onerror = () => {
            clearTimeout(emniyetZamanlayici);
            resolve();
        };

        window.speechSynthesis.speak(utterance);
    });
}

// --- 3. TEST YÜKLEME (SORUBANKASI TABLOSU) ---
document.addEventListener("DOMContentLoaded", () => {
sesleriOnbellegeAl();
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
// 1. Yazıyı her zaman güncelle


    // 2. Etiketleri sadece ilk seferde ekle (Tekrarı ve gevezeliği önler)
    const soruBaslik = document.getElementById("soru-metni");
let finalHTML = "";

    // 1. Görsel Betimleme (Sadece ekran okuyucu duyar)
    if (soruObj.gorsel_metin && soruObj.gorsel_metin !== "HÜKÜMSÜZ") {
        finalHTML += `<div class="sr-only" tabindex="0">Görsel Betimleme: ${soruObj.gorsel_metin}</div>`;
    }
// 2. Soru Kökü ve Paragraf İşleme (Geliştirilmiş Sürüm)
    let islenenMetin = soruObj.soru_koku;
    const isMobile = window.innerWidth < 768;
    // HİZALAMA AYARI: Mobilde normal (left), bilgisayarda hizalı (justify)
    const hizalama = isMobile ? 'left' : 'justify'; 

    const paragrafModu = /\d+\.\s/.test(islenenMetin) && islenenMetin.includes("1.") && islenenMetin.includes("2.");

    if (paragrafModu) {
        // --- NUMARALI CÜMLE MODU (Senin eski ayarların burada korunuyor) ---
        let parcalar = islenenMetin.split(/(?=\d+\.\s)/); 
        let paragrafHTML = "";
        let talimatHTML = "";
// Numaralı cümleler bittikten sonra, eğer talimat en sonda kalmışsa onu üste almayı garanti eder
        parcalar.forEach(parca => {
            let temizParca = parca.trim();
            if (temizParca.length > 0) {
                if (!/^\d+\./.test(temizParca)) {
                    // Eğer parça rakamla başlamıyorsa (yani soru talimatıysa)
                    // Mevcut talimatın üzerine ekle (+= kullanarak biriktiriyoruz)
                    talimatHTML += `<div class="soru-talimat" tabindex="0" style="margin-bottom:15px; font-weight:bold; display:block; font-size:1.2rem; color:#00ff00; text-align:${hizalama};">${temizParca}</div>`;
                } else {
                    // Numaralı cümleler (1. 2. 3. diye gidenler)
                    paragrafHTML += `<div class="paragraf-cumle" tabindex="0" role="listitem" style="display:block; margin-bottom:8px; padding:10px; background:#222; border-left: 5px solid #00ff00; font-size:1.15rem; line-height:1.5; border-radius:5px; text-align:${hizalama};">${temizParca}</div>`;
                }
            }
        });
        finalHTML += talimatHTML + `<div class="paragraf-alani" role="list" aria-label="Numaralanmış cümleler" style="margin-bottom:15px;">${paragrafHTML}</div>`;

    } else {
        // --- NORMAL MOD (Hizalama ve Soru Kökünü Üste Alma Buraya Eklendi) ---
        const ayiricilar = ["Bu parçada", "Bu parçaya göre", "Buna göre", "Aşağıdakilerden hangisi", "Bu parçanın konusu", "Bu cümlede"];
        let kesmeNoktasi = -1;

        // Metnin sonundaki soru kökünü arar
        ayiricilar.forEach(a => {
            let pos = islenenMetin.lastIndexOf(a);
            if (pos > kesmeNoktasi) kesmeNoktasi = pos;
        });

        if (kesmeNoktasi !== -1) {
            // Soru kökünü ve paragrafı ayırır
            let govde = islenenMetin.substring(0, kesmeNoktasi).trim();
            let soru = islenenMetin.substring(kesmeNoktasi).trim();
            
            // Önce Soruyu (Yeşil), sonra Paragrafı (Beyaz) yazar
            finalHTML += `<div class="soru-talimat" tabindex="0" style="margin-bottom:15px; font-weight:bold; display:block; color:#00ff00; text-align:${hizalama};">${soru}</div>`;
            finalHTML += `<div class="soru-ana-metin" tabindex="0" style="margin-bottom:15px; display:block; text-align:${hizalama};">${govde}</div>`;
        } else {
            // Eğer ayırıcı yoksa normal yazdırır
            finalHTML += `<div class="soru-ana-metin" tabindex="0" style="margin-bottom:15px; font-weight:bold; display:block; text-align:${hizalama};">${islenenMetin}</div>`;
        }
    }
    // 3. Öncüller (Soru Kökünün Altında - Her biri ayrı satır ve ayrı odak noktası)
    if (soruObj.oncul && soruObj.oncul !== "HÜKÜMSÜ?Z" && soruObj.oncul !== "HÜKÜMSÜZ") {
// Öncül başlığı (Sadece öncüllü sorularda duyulur)
        finalHTML += `<div tabindex="0" style="font-weight: bold; color: #ffff00; margin-top: 10px; margin-bottom: 5px;">Soru Öncülleri:</div>`;
        
        // Metindeki tırnak, parantez gibi gereksiz işaretleri temizler
        let temizOncul = soruObj.oncul.replace(/[\[\]"']/g, '').trim();
        const onculParcalari = temizOncul.split(/(?=[IVX]+\.|\d+\.)|<br\s*\/?>|\n/g);        
        
        onculParcalari.forEach(parca => {
            const temizParca = parca.trim();
            if (temizParca.length > 0) {
                finalHTML += `<div class="oncul-satir" tabindex="0" style="display: block; border-left: 3px solid #ffff00; padding: 10px; margin-bottom:10px; font-size: 1.4rem;">${temizParca}</div>`;
            }
        });
    } // Bu if bloğunu kapatır
    soruBaslik.innerHTML = finalHTML;
// Otomatik Soru Uzunluğu Kontrolü
    const toplamMetinUzunlugu = (soruObj.soru_koku || "").length + (soruObj.oncul || "").length;
    const container = document.querySelector(".container");
    if (toplamMetinUzunlugu > 250) { 
        container.classList.add("uzun-soru");
    } else {
        container.classList.remove("uzun-soru");
    }
    // Şıklar Alanı
    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";
soruObj.siklar.forEach((sikMetni, i) => { 
        const btn = document.createElement("button");
        const harf = ["A", "B", "C", "D", "E"][i];

        // Veritabanındaki "eA şıkkı: A)" veya "A şıkkı:" gibi her türlü hatayı temizler
        const temizIcerik = metniTemizle(sikMetni);
        
        // Ekranda sadece "A) Sanat eserleri..." görünmesini sağlar
        btn.innerText = harf + ") " + temizIcerik;
        btn.className = "sik-butonu";

        // NVDA için tertemiz etiket: "A şıkkı: Sanat eserleri"
        btn.setAttribute("aria-label", `${harf} şıkkı: ${temizIcerik}`); 

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
setTimeout(() => { 
        if(soruSayacElement) {
            // Yazıyı TAM ŞİMDİ değiştiriyoruz
            soruSayacElement.innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;
            // Ve hemen üzerine odaklanıyoruz
            soruSayacElement.focus(); 
        }
    }, 100);
}
// --- 5. CEVAPLAMA VE SESLİ GERİ BİLDİRİM (GÜNCELLENDİ) ---
async function cevapIsaretle(secilenIndex, btn) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true; 
    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    
    const soruObj = mevcutSorular[mevcutSoruIndex];
    const harf = ["A", "B", "C", "D", "E"][secilenIndex];
    const dogruHarf = soruObj.dogru_cevap; 
    const dogruMu = (harf === dogruHarf);
    const secilenMetin = soruObj.siklar[secilenIndex];
    const dogruMetin = soruObj.siklar[["A","B","C","D","E"].indexOf(dogruHarf)];

    // 1. Görsel Geri Bildirim (Hemen Renklendir)
    if (dogruMu) {
        btn.classList.add("dogru");
    } else {
        btn.classList.add("yanlis");
        document.querySelectorAll(".sik-butonu").forEach(b => {
            if(b.innerText.startsWith(dogruHarf + ")")) b.classList.add("dogru");
        });
    }

    const ttsKapali = document.getElementById("tts-kapat-onay")?.checked;
    const isMobile = window.innerWidth < 768;

    // 2. Ses Dosyası Kontrolü (Telefonda veya TTS kapalıyken davranışı ayarla)
    // Masaüstündeysek ses çalarız. Mobilde ses çalmayıp direkt konuşmaya geçeriz.
if (!isMobile) {
        // Bilgisayarda mp3 sesinin bitmesini beklemiyoruz, hemen arkasından konuşma başlasın
        sesUret(dogruMu ? 'dogru' : 'yanlis');
    }
    // 3. Mesaj Oluşturma (Şıkkın içeriğini de ekledik)
    let msg = "";
    if (dogruMu) {
        msg = `Doğru! ${harf} şıkkını işaretlediniz: ${secilenMetin}.`;
    } else {
        msg = `Yanlış. ${harf} şıkkını işaretlediniz: ${secilenMetin}. Doğru cevap ${dogruHarf}: ${dogruMetin}.`;
    }

    // 4. Konuşma ve Geçiş Mantığı
    if (!ttsKapali) {
        // TTS açık: Mesaj bitene kadar bekle (await)
        await metniOkuBekle(msg);
    } else if (!isMobile) {
        // TTS kapalı ama bilgisayardaysak: Kısa bir bekleme süresi koyalım (1 saniye)
        await new Promise(r => setTimeout(r, 1000));
    }

    // 5. Diğer Soruya Geçiş (Konuşma bittikten sonra buraya gelir)
    if (mevcutSoruIndex < mevcutSorular.length - 1) {
        sonrakiSoru();
    } else {
        testiBitir();
    }
}
// --- 6. CEVAP ANAHTARI (Sütun: aciklama) ---
// --- 6. PUAN HESAPLAMA VE SONUÇ EKRANI (ESKİ MANTIK) ---
function testiBitir() {
    sesUret('bitis'); 
    let d = 0, y = 0, b = 0;
    mevcutSorular.forEach((soru, i) => {
        const secilenIndex = kullaniciCevaplari[i];
        const secilenHarf = secilenIndex !== null ? ["A", "B", "C", "D", "E"][secilenIndex] : null;
        
        if (secilenHarf === null) {
            b++;
        } else if (secilenHarf === soru.dogru_cevap) {
            d++;
        } else {
            y++;
        }
    });
    
    // Eski dosyadaki net ve puan formülü
    const net = d - (y / 4);
    let puan = net * 5;
    if (puan < 0) puan = 0; // Puan eksiye düşmesin

    document.getElementById("soru-alani").style.display = "none";
    document.getElementById("sonuc-alani").style.display = "block";
    document.getElementById("puan-detay").innerHTML = `
        <div style="border: 4px solid #fff; padding: 20px; border-radius: 10px; background:#000; margin-bottom:20px;">
            <p style="font-size:1.5rem; color:#fff;" tabindex="0"><strong>TOPLAM PUAN: ${puan.toFixed(2)} / 100</strong></p>
            <p tabindex="0" style="font-size:1.2rem; color:#ccc;">Doğru: ${d} | Yanlış: ${y} | Boş: ${b}</p>
            <p tabindex="0" style="font-size:1.2rem; color:#ffff00;">Net: ${net.toFixed(2)}</p>
        </div>
        <button class="nav-buton" onclick="cevapAnahtariniGoster()" style="width:100%;">📝 DETAYLI ANALİZ</button>
        <a href="${akilliGeriDonSayfasi}" class="nav-buton" style="display:block; text-align:center; margin-top:10px;">Test Listesine Dön</a>
    `;
    
    // Odağı sonuç başlığına al
    setTimeout(() => { document.querySelector('#puan-detay strong').focus(); }, 100);
}
function cevapAnahtariniGoster() {
    const testParam = new URLSearchParams(window.location.search).get('id');
    const isTurkish = testParam && testParam.startsWith('paragraf'); 
    let container = document.getElementById("cevap-anahtari-konteyner") || document.createElement("div");
    container.id = "cevap-anahtari-konteyner";
    document.getElementById("sonuc-alani").appendChild(container);
    container.innerHTML = `<h2 style="color:#ffff00; text-align:center; margin-top:20px;" tabindex="0">ÇÖZÜMLER VE ANALİZ</h2>`;

    if (isTurkish) {
        mevcutCozumIndex = 0;
        gosterTurkceCozum(mevcutCozumIndex, container);
    } else {
        mevcutSorular.forEach((soru, index) => {
            const secilenIndex = kullaniciCevaplari[index];
            const secilenHarf = secilenIndex !== null ? ["A", "B", "C", "D", "E"][secilenIndex] : "BOŞ";
            const kart = document.createElement("div");
            kart.style.cssText = "border:1px solid #444; padding:15px; margin-top:15px; background:#222; border-radius:8px;";
            
            // Şıkların listelenmesi
const siklarListesi = soru.siklar.map((s, i) => {
const harf = ["A", "B", "C", "D", "E"][i];
let temizMetin = metniTemizle(s);
            const finalSik = harf + ") " + temizMetin;
            return `<div style="margin-left:10px; color:${harf === soru.dogru_cevap ? '#00ff00' : '#ccc'}">${finalSik}</div>`;
}).join('');

            kart.innerHTML = `
                <h3 style="color:#ffff00;" tabindex="0">Soru ${index + 1}</h3>
                <div tabindex="0" style="margin-bottom:10px;"><strong>Soru:</strong> ${soru.soru_koku}</div>
                ${soru.oncul && soru.oncul !== 'HÜKÜMSÜZ' ? `<div tabindex="0" style="font-style:italic; color:#aaa; margin-bottom:10px;">${soru.oncul}</div>` : ''}
                <div tabindex="0" style="margin-bottom:10px;"><strong>Şıklar:</strong><br>${siklarListesi}</div>
                <p style="color:${secilenHarf === soru.dogru_cevap ? '#00ff00' : '#ff4444'}" tabindex="0">
                    <strong>Senin Cevabın:</strong> ${secilenHarf} | <strong>Doğru:</strong> ${soru.dogru_cevap}
                </p>
                <div style="background:#333; padding:10px; border-left:4px solid #ffff00; margin-top:10px; color:#ddd;" tabindex="0">
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
    
const siklarListesi = soru.siklar.map((s, i) => {
const harf = ["A", "B", "C", "D", "E"][i];
let temizMetin = metniTemizle(s);
    const finalSik = harf + ") " + temizMetin;
    return `<div style="margin-left:10px; color:${harf === soru.dogru_cevap ? '#00ff00' : '#ccc'}">${finalSik}</div>`;
}).join('');

    const kart = document.createElement("div");
    kart.style.cssText = "border:1px solid #444; padding:20px; background:#222; border-radius:8px; margin-top:20px;";
    kart.innerHTML = `
        <h3 style="color:#ffff00; margin-bottom:15px;" tabindex="0">Soru ${index + 1} Çözümü</h3>
        <div tabindex="0" style="margin-bottom:10px;"><strong>Soru Kökü:</strong> ${soru.soru_koku}</div>
        ${soru.oncul && soru.oncul !== 'HÜKÜMSÜZ' ? `<div tabindex="0" style="margin-bottom:10px; background:#111; padding:10px;">${soru.oncul}</div>` : ''}
        <div tabindex="0" style="margin-bottom:10px;"><strong>Şıklar:</strong><br>${siklarListesi}</div>
        <p style="font-weight:bold; color:${secilenHarf === soru.dogru_cevap ? '#00ff00' : '#ff4444'}" tabindex="0">
            Cevabınız: ${secilenHarf} / Doğru Cevap: ${soru.dogru_cevap}
        </p>
        <div style="background:#111; padding:15px; border-left:5px solid #00ff00; margin-top:15px;" tabindex="0">
            <strong style="color:#00ff00;">💡 Detaylı Analiz:</strong><br><br>${soru.aciklama || "Açıklama eklenmemiş."}
        </div>
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button class="nav-buton" style="flex:1" onclick="gosterTurkceCozum(${index-1}, document.getElementById('cevap-anahtari-konteyner'))" ${index===0?'disabled':''}>Geri</button>
            <button class="nav-buton" style="flex:1" onclick="${index < mevcutSorular.length-1 ? `gosterTurkceCozum(${index+1}, document.getElementById('cevap-anahtari-konteyner'))` : 'location.reload()'}">${index < mevcutSorular.length-1 ? 'Sonraki Çözüm' : 'Testi Kapat'}</button>
        </div>`;
    container.appendChild(kart);
    setTimeout(() => { kart.querySelector('h3').focus(); }, 100);
}