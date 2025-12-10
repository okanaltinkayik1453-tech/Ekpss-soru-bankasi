// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;
let akilliGeriDonSayfasi = "index.html"; // YENİ: Akıllı geri dönüş sayfası tutulur

// JSON DOSYALARININ YOLU
const JSON_PATH = './data/';

// JSON Dosya Adı Eşleştirme Haritası
const DOSYA_ESLESTIRME = {
    "ilkturkislam": "ilkturkislamdevletleri.json",
    "islamoncesi": "islamoncesiturkdevletleri.json",
    "osmanlikultur": "osmanlikulturmedeniyeti.json",
    "osmanlikurulus": "osmanlikurulus.json",
    "osmanliyukselme": "osmanliyukselme.json",
    "osmanligerileme": "osmanligerilemevedagilma.json",
    "mesrutiyet": "mesrutiyet.json",
    "inkilap": "1dunyasavasivekurtulussavasi.json",
    "cumhuriyet": "cumhuriyetdonemi.json",
    "guncel": "guncelbilgiler.json",
"karma": "karmatestler.json",
"cografyaiklim": "cografya_iklim.json",
"cografyayersekilleri": "cografya_yersekilleri.json",
"cografyanufus": "cografya_nufus.json",
"cografyaekonomik": "cografya_ekonomik.json",
"cografyabolgeler": "cografya_bolgeler.json"
};
// SAYFA YÖNLENDİRME LİSTESİ
const SAYFA_ESLESTIRME = {
    "cografyaiklim": "cografya.html",
    "cografyayersekilleri": "cografya.html",
"cografyanufus": "cografya.html",
"cografyaekonomik": "cografya.html",
"cografyabolgeler": "cografya.html",
    "guncel": "guncel.html",
    "ilkturkislam": "index.html", 
    "islamoncesi": "index.html",
    "osmanlikultur": "index.html",
    "osmanlikurulus": "index.html",
    "osmanliyukselme": "index.html",
    "osmanligerileme": "index.html",
    "mesrutiyet": "index.html",
    "inkilap": "index.html",
    "cumhuriyet": "index.html",
    "karma": "index.html"
};
// --- SES MOTORU ---
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
// --- YENİ EKLENEN BEKÇİ FONKSİYONLAR ---
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
        } else {
            resolve();
        }
    });
}

function metniOkuBekle(metin) {
    return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        let utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.1; 
        utterance.onend = () => { resolve(); };
        utterance.onerror = () => { resolve(); };
        window.speechSynthesis.speak(utterance);
    });
}
// ---------------------------------------
// --- TEST YÖNETİMİ ---
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const testParam = urlParams.get('id'); 
    
    if (testParam) {
        const onEk = testParam.substring(0, testParam.lastIndexOf('_'));
        const dosyaAdi = DOSYA_ESLESTIRME[onEk];
        const testNoStr = testParam.split('_test')[1];
        const testNo = parseInt(testNoStr); 
// --- AKILLI GERİ DÖN SİSTEMİ ---
        // Listede varsa oraya, yoksa index.html sayfasina gider
        const donulecekSayfa = SAYFA_ESLESTIRME[onEk] || "index.html"; 
        akilliGeriDonSayfasi = donulecekSayfa; // YENİ: Akıllı geri dönüş sayfasını kaydet

        setTimeout(() => {
            const tumLinkler = document.querySelectorAll("a");
            tumLinkler.forEach(link => {
                if(link.innerText.includes("Listeye") || link.innerText.includes("Geri")) {
                    link.href = donulecekSayfa;
                }
            });
        }, 1000);
        // --------------------------------
        if (dosyaAdi && !isNaN(testNo)) {
            testiYukle(dosyaAdi, testNo);
        } else {
             const soruAlani = document.getElementById("soru-alani");
             if(soruAlani) {
                 soruAlani.innerHTML = `<div style="text-align:center; padding:20px;"><div class="baslik-h2-gibi">Test ID Hatası</div><p>Lütfen ID'yi kontrol edin.</p><a href="testler.html" class="aksiyon-butonu">Listeye Dön</a></div>`;
                 if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
             }
        }
    } else {
        const soruAlani = document.getElementById("soru-alani");
        if(soruAlani) {
             soruAlani.innerHTML = `<div style="text-align:center; padding:20px;"><div class="baslik-h2-gibi">Test Seçilmedi</div><a href="testler.html" class="aksiyon-butonu">Test Listesine Git</a></div>`;
            if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
        }
    }
});

function testiYukle(dosyaAdi, testNo) {
    const url = JSON_PATH + dosyaAdi;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Dosya yüklenemedi: ${response.statusText}`);
            }
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
                    document.getElementById("soru-alani").innerHTML = `<div style="text-align:center; padding:20px;"><div class="baslik-h2-gibi">Test Bulunamadı</div><p>Bu test henüz eklenmemiş olabilir.</p><a href="testler.html" class="aksiyon-butonu">Listeye Dön</a></div>`;
                }
            } else {
                 document.getElementById("soru-alani").innerHTML = `<div style="text-align:center; padding:20px;"><div class="baslik-h2-gibi">Veri Hatası</div><a href="testler.html" class="aksiyon-butonu">Listeye Dön</a></div>`;
            }
        })
        .catch(error => {
            console.error("Hata:", error);
            const soruAlani = document.getElementById("soru-alani");
            soruAlani.innerHTML = `<div style="text-align:center; padding:20px; color:#ff0000;"><div class="baslik-h2-gibi">Yükleme Hatası</div><p>Veri dosyası okunamadı. Lütfen internet bağlantınızı veya dosya adlarını kontrol edin.</p><a href="testler.html" class="aksiyon-butonu">Listeye Dön</a></div>`;
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

function soruyuGoster(index) {
    window.scrollTo({ top: 0, behavior: 'auto' });

    const uyariKutusu = document.getElementById("sesli-uyari");
    if(uyariKutusu) uyariKutusu.innerText = "";
    
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    if (gorselUyari) gorselUyari.style.display = "none";

    mevcutSoruIndex = index;
    const soruObj = mevcutSorular[index];
    isaretlemeKilitli = false; 
    
    const cubuk = document.getElementById("ilerleme-cubugu");
    if(cubuk) cubuk.style.width = `${((index + 1) / mevcutSorular.length) * 100}%`;

    const soruSayacElement = document.getElementById("soru-sayac");
    soruSayacElement.innerText = `Soru ${index + 1} / ${mevcutSorular.length}`;
    soruSayacElement.setAttribute("tabindex", "-1"); 

    const soruBaslik = document.getElementById("soru-metni");
    soruBaslik.removeAttribute('aria-hidden'); 
    soruBaslik.removeAttribute('role'); 
    soruBaslik.setAttribute('tabindex', '-1'); 

    let finalHTML = "";
    let toplamMetinKontrol = ""; 
    
    if (soruObj.onculGiris) {
        finalHTML += `<p class="soru-giris" style="margin-bottom:10px;">${soruObj.onculGiris}</p>`;
        toplamMetinKontrol += soruObj.onculGiris;
    }
    
    if (soruObj.soru && soruObj.soru !== soruObj.onculGiris) {
         finalHTML += `<p class="soru-ana-metin" style="margin-bottom:10px;">${soruObj.soru}</p>`;
         toplamMetinKontrol += soruObj.soru;
    }

    let onculHTML = "";
    if (soruObj.onculler && soruObj.onculler.length > 0) {
        onculHTML += `<ul class='oncul-kapsayici' style="margin: 10px 0; list-style:none; padding:0;">`; 
        soruObj.onculler.forEach(oncul => {
            const match = oncul.match(/^(\d+\.?|\w\.?)\s*(.*)/);
            onculHTML += `<li class='oncul-satir' style="margin-bottom:5px;"><span class='oncul-no' style="font-weight:bold; margin-right:5px;">${match ? match[1] : ''}</span><span class='oncul-yazi'>${match ? match[2] : oncul}</span></li>`;
            toplamMetinKontrol += oncul;
        });
        onculHTML += `</ul>`;
    }

    let soruKokuHTML = "";
    if (soruObj.soruKoku) {
        soruKokuHTML = `<p class='soru-koku-vurgu' style="font-weight:bold; margin-top:10px;">${soruObj.soruKoku}</p>`;
        toplamMetinKontrol += soruObj.soruKoku;
    }

    const container = document.querySelector(".container");
    if (toplamMetinKontrol.length > 250) {
        container.classList.add("uzun-soru");
    } else {
        container.classList.remove("uzun-soru");
    }

    const yerlesim = soruObj.oncul_yerlesim || "ONCE_KOK"; 
    if (yerlesim === "ONCE_KOK") { finalHTML += onculHTML + soruKokuHTML; } 
    else { finalHTML += soruKokuHTML + onculHTML; }

    soruBaslik.innerHTML = finalHTML;

    const siklarKutusu = document.getElementById("siklar-alani");
    siklarKutusu.innerHTML = "";
    const uzunSikVar = soruObj.secenekler.some(sik => sik.length > 40);
    if (uzunSikVar) siklarKutusu.classList.add("tek-sutun");
    else siklarKutusu.classList.remove("tek-sutun");

    soruObj.secenekler.forEach((sik, i) => { 
        const btn = document.createElement("button");
        const harf = getSikHarfi(i);
        btn.innerText = harf + ") " + sik;
        btn.className = "sik-butonu";
        btn.setAttribute("aria-label", `${harf} şıkkı: ${sik}`); 
        if (kullaniciCevaplari[index] !== null) {
            if (harf === getSikHarfi(kullaniciCevaplari[index])) {
                btn.classList.add(harf === soruObj.dogru_cevap ? "dogru" : "yanlis");
            }
            btn.disabled = true;
        }
        btn.onclick = () => cevapIsaretle(i, btn);
        siklarKutusu.appendChild(btn);
    });

    document.getElementById("btn-onceki").disabled = (index === 0);
    document.getElementById("btn-sonraki").disabled = (index === mevcutSorular.length - 1);
    if (kullaniciCevaplari[index] === null) soruSayacElement.focus();
}
async function cevapIsaretle(secilenIndex, btnElement) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true; 
    
    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    
    const hamMetin = btnElement.innerText; 
    const secilenSikHarfi = hamMetin.charAt(0); 
    const secilenCevapMetni = hamMetin.substring(3).trim(); 

    const dogruCevapHarf = mevcutSorular[mevcutSoruIndex].dogru_cevap; 
    const dogruMu = (secilenSikHarfi === dogruCevapHarf);
    
    let dogruCevapMetni = "";
    mevcutSorular[mevcutSoruIndex].secenekler.forEach((sik, i) => {
        if(getSikHarfi(i) === dogruCevapHarf) dogruCevapMetni = sik;
    });

    // Görsel İşlemler
    if (dogruMu) {
        btnElement.classList.add("dogru"); 
    } else {
        btnElement.classList.add("yanlis"); 
        const butonlar = document.querySelectorAll(".sik-butonu");
        butonlar.forEach(b => {
            if(b.innerText.startsWith(dogruCevapHarf + ")")) {
                b.classList.add("dogru");
            }
        });
    }

    // Okunacak Metni Hazırla
    let konusulacakMetin = "";
    if (dogruMu) {
        konusulacakMetin = `Doğru! Cevabınız ${secilenSikHarfi}, ${secilenCevapMetni}.`;
    } else {
        konusulacakMetin = `Yanlış. Siz ${secilenSikHarfi} dediniz. Doğru cevap ${dogruCevapHarf}, ${dogruCevapMetni}.`;
    }
// --- SIRALI İŞLEM BAŞLIYOR (ASYNC/AWAIT) ---
    
    // Cihaz Kontrolü: Kullanıcı mobilde mi?
    const mobilMi = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (mobilMi) {
        // --- MOBİL İÇİN ÖZEL AKIŞ (Hızlı Geçiş) ---
        // Sesi beklemeden çal (Browser engeline takılmamak için)
        sesUret(dogruMu ? 'dogru' : 'yanlis');
        
        // Okuma emniyet kilidi (4 saniye sonra her türlü devam eder)
        const okuma = metniOkuBekle(konusulacakMetin);
        const kilit = new Promise(r => setTimeout(r, 4000));
        await Promise.race([okuma, kilit]);

    } else {
        // --- BİLGİSAYAR İÇİN ORİJİNAL AKIŞ (Senin Eski Kodun) ---
        // Burası bilgisayarda %100 aynı kalır, sırasıyla bekler.
        if (dogruMu) {
            await sesCalBekle('dogru');
        } else {
            await sesCalBekle('yanlis');
        }

        // Nefes payı
        await new Promise(r => setTimeout(r, 300));

        // Metni oku ve bitmesini bekle
        await metniOkuBekle(konusulacakMetin);
    }
    // 4. Her şey bitti, şimdi diğer soruya geç
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    if(gorselUyari) gorselUyari.style.display = "none";

    if (mevcutSoruIndex < mevcutSorular.length - 1) {
        sonrakiSoru(); 
    } else {
        testiBitir();
    }
}
function getSikHarfi(index) { return ["A", "B", "C", "D", "E"][index]; }
function formatSoruMetni(soruObj) {
    let finalHTML = "";
    
    // 1. Öncül Giriş
    if (soruObj.onculGiris) {
        finalHTML += `<p class="soru-giris" style="margin-bottom:10px;">${soruObj.onculGiris}</p>`;
    }
    
    // 2. Ana Soru Metni
    // onculGiris ile aynı metin değilse veya onculGiris yoksa yaz
    if (soruObj.soru && soruObj.soru !== soruObj.onculGiris) {
         finalHTML += `<p class="soru-ana-metin" style="margin-bottom:10px;">${soruObj.soru}</p>`;
    }

    // 3. Öncüller (1, 2, 3... Maddeler)
    let onculHTML = "";
    if (soruObj.onculler && soruObj.onculler.length > 0) {
        onculHTML += `<ul class='oncul-kapsayici' style="margin: 10px 0; list-style:none; padding:0;">`; 
        soruObj.onculler.forEach(oncul => {
            const match = oncul.match(/^(\d+\.?|\w\.?)\s*(.*)/);
            onculHTML += `<li class='oncul-satir' style="margin-bottom:5px;"><span class='oncul-no' style="font-weight:bold; margin-right:5px;">${match ? match[1] : ''}</span><span class='oncul-yazi'>${match ? match[2] : oncul}</span></li>`;
        });
        onculHTML += `</ul>`;
    }

    // 4. Soru Kökü
    let soruKokuHTML = "";
    if (soruObj.soruKoku) {
        soruKokuHTML = `<p classu'soru-koku-vurgu' style="font-weight:bold; margin-top:10px;">${soruObj.soruKoku}</p>`;
    }

    // 5. Yerleşime Göre Birleştirme
    const yerlesim = soruObj.oncul_yerlesim || "ONCE_KOK"; 
    if (yerlesim === "ONCE_KOK") { finalHTML += onculHTML + soruKokuHTML; } 
    else { finalHTML += soruKokuHTML + onculHTML; }

    return finalHTML;
}
function testiBitir() {
    sesUret('bitis'); 
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

    document.getElementById("soru-alani").style.display = "none";
    document.getElementById("bitir-buton").style.display = "none";
    document.getElementById("sonuc-alani").style.display = "block";

    const sonucHTML = `
        <div style="border: 4px solid #fff; padding: 20px; border-radius: 10px; margin-bottom: 20px; background:#000;">
            <p style="font-size:1.5rem; color:#fff;"><strong>TOPLAM PUAN: ${puan.toFixed(2)} / 100</strong></p>
            <p style="font-size:1.2rem; color:#ccc;">Doğru: ${dogruSayisi} | Yanlış: ${yanlisSayisi} | Boş: ${bosSayisi}</p>
        </div>
        <button class="nav-buton" onclick="cevapAnahtariniGoster()" style="width:100%;">📝 CEVAP ANAHTARI</button>
        <a href="${akilliGeriDonSayfasi}" class="nav-buton" style="width:100%; margin-top: 10px; display:block; text-align:center;">Yeni Test Seç</a>
    `;
    document.getElementById("puan-detay").innerHTML = sonucHTML;
}
function cevapAnahtariniGoster() {
    // Sonuç alanını bul veya oluştur
    let hedefDiv = document.getElementById("sonuc-alani");
    
    // Eğer daha önce oluşturulmuş bir cevap anahtarı varsa temizle, yoksa yeni oluştur
    let container = document.getElementById("cevap-anahtari-konteyner");
    if (container) {
        container.innerHTML = "";
    } else {
        container = document.createElement("div");
        container.id = "cevap-anahtari-konteyner";
        container.className = "cevap-anahtari-kapsayici";
        // Stil eklemeleri: Şıkların alt alta düzgün durması için
        container.style.marginTop = "20px";
        hedefDiv.appendChild(container);
    }

    // Başlık
    const baslik = document.createElement("h2");
    baslik.innerText = "CEVAP ANAHTARI VE DETAYLI ÇÖZÜMLER";
    baslik.style.cssText = "text-align:center; color:#ffff00; margin-bottom:20px;";
    baslik.setAttribute("tabindex", "0"); // Başlığa odaklanabilsin
    container.appendChild(baslik);

    // Soruları döngüye al
    mevcutSorular.forEach((soru, index) => {
        const kullaniciSecimiIndex = kullaniciCevaplari[index];
        const dogruCevapHarfi = soru.dogru_cevap;
        
        // Soru Kartı Oluştur
        const kart = document.createElement("div");
        kart.className = "sonuc-karti";
        kart.style.cssText = "border: 1px solid #444; padding: 15px; margin-bottom: 20px; background: #222; border-radius: 8px;";
        
        // 1. Soru Metni
        let soruMetniHTML = `<h3 style="color:#fff; margin-bottom:10px;" tabindex="0">Soru ${index + 1}</h3>`;
// Öncüllerin gösterimi için soruyuGoster fonksiyonundakine benzer bir yapı kuruyoruz.
        let soruGosterimHTML = formatSoruMetni(soru); // Yeni fonksiyonu kullanıyoruz
        soruMetniHTML += `<div style="color:#eee; margin-bottom:15px; font-size:1.1rem;" tabindex="0">${soruGosterimHTML}</div>`;
        
        // 2. Şıkların Listelenmesi
        let siklarHTML = `<div class="cevap-siklari-listesi" style="display:flex; flex-direction:column; gap:10px;">`;
        
        soru.secenekler.forEach((sikMetni, i) => {
            const harf = getSikHarfi(i);
            const buSikSecildi = (i === kullaniciSecimiIndex);
            
            // Renk ve Durum Ayarları
            let arkaPlanRengi = "#333"; // Varsayılan şık rengi
            let kenarlik = "1px solid #555";
            let durumMetni = ""; // NVDA'nın okuyacağı ek metin
            
            if (buSikSecildi) {
                // Kullanıcı bunu seçmiş
                if (harf === dogruCevapHarfi) {
                    // Doğru bilmiş
                    arkaPlanRengi = "#1a4d1a"; // Koyu yeşil
                    kenarlik = "2px solid #00ff00";
                    durumMetni = "(Sizin cevabınız - DOĞRU)";
                } else {
                    // Yanlış bilmiş
                    arkaPlanRengi = "#4d1a1a"; // Koyu kırmızı
                    kenarlik = "2px solid #ff0000";
                    durumMetni = "(Sizin cevabınız - YANLIŞ)";
                }
            }

            // Şık Kutusu HTML
            // aria-label kullanarak ekran okuyucuya şıkkı, metni ve durumu tek seferde okutuyoruz.
            siklarHTML += `
                <div style="background:${arkaPlanRengi}; border:${kenarlik}; padding:10px; border-radius:5px; color:#fff;" tabindex="0" aria-label="${harf} şıkkı: ${sikMetni}. ${durumMetni}">
                    <span style="font-weight:bold; color:#ffcc00;">${harf})</span> ${sikMetni} 
                    <span style="font-weight:bold; float:right;">${durumMetni}</span>
                </div>
            `;
        });
        siklarHTML += `</div>`;

        // 3. Doğru Cevap ve Açıklama Alanı (Kartın en altı)
        // İlgili şıkkın metnini bulalım
        let dogruCevapMetni = "";
        soru.secenekler.forEach((s, k) => { if(getSikHarfi(k) === dogruCevapHarfi) dogruCevapMetni = s; });

        const altBilgiHTML = `
            <div style="margin-top:20px; padding-top:15px; border-top:1px dashed #666;">
                <p tabindex="0" style="color:#00ff00; font-weight:bold; margin-bottom:5px;">
                    ✅ Doğru Cevap: ${dogruCevapHarfi}) ${dogruCevapMetni}
                </p>
                <div tabindex="0" style="background:#333; padding:10px; border-left:4px solid #ffff00; margin-top:10px; color:#ddd;">
                    <strong>💡 Açıklama:</strong><br>
                    ${soru.aciklama ? soru.aciklama : "Bu soru için açıklama bulunmuyor."}
                </div>
            </div>
        `;

        kart.innerHTML = soruMetniHTML + siklarHTML + altBilgiHTML;
        container.appendChild(kart);
    });

    // Sayfayı başlığa kaydır ve odakla
    container.scrollIntoView();
    baslik.focus();
}