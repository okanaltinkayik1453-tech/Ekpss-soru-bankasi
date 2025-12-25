// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let mevcutCozumIndex = 0; // YENİ: Türkçe çözümü için navigasyon indeksi
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
    "cografyabolgeler": "cografya_bolgeler.json",
    "vatandaslik": "vatandaslik.json",
    "paragraf1": "paragraf1.json",
    "paragraf2": "paragraf2.json",
    "paragraf3": "paragraf3.json",
    "dilbilgisi": "turkce_dilbilgisi.json",
    "turkcekarisik": "turkce_karisik.json",
    "inkilapkarma": "inkilapkarma.json",
    "trablusgarp": "trablusgarpvebalkan.json"
};

// SAYFA YÖNLENDİRME LİSTESİ
const SAYFA_ESLESTIRME = {
    "cografya": "cografya.html", // DÜZELTME: Coğrafya ana yönlendirmesi eklendi
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
        utterance.rate = 1.4; 
        utterance.onend = () => { resolve(); };
        utterance.onerror = () => { resolve(); };
        window.speechSynthesis.speak(utterance);
    });
}
// --- SESLERİ TARAYICIYA KAYDETME (NETLİFY KOTA DOSTU) ---
async function sesleriOnbellegeAl() {
    const sesDosyalari = ['dogru.mp3', 'yanlis.mp3', 'bitis.mp3'];
    try {
        const cache = await caches.open('ekpss-ses-onbellegi');
        // Sadece eksik olan dosyaları kontrol et ve indir
        for (const ses of sesDosyalari) {
            const response = await cache.match(ses);
            if (!response) {
                await cache.add(ses);
                console.log(ses + " önbelleğe alındı.");
            }
        }
    } catch (e) {
        console.log("Önbellekleme hatası (Kota etkilenmez):", e);
    }
}
// --- TEST YÖNETİMİ ---
document.addEventListener("DOMContentLoaded", () => {
    sesleriOnbellegeAl(); // Yeni eklenen satır
    const urlParams = new URLSearchParams(window.location.search);
    const testParam = urlParams.get('id'); 
    
    if (testParam) {
        const onEk = testParam.split('_')[0];
        const dosyaAdi = DOSYA_ESLESTIRME[onEk];
        const testNoStr = testParam.split('_test')[1];
        const testNo = parseInt(testNoStr); 

        const donulecekSayfa = SAYFA_ESLESTIRME[onEk] || "index.html"; 
        akilliGeriDonSayfasi = donulecekSayfa; 

        setTimeout(() => {
            const tumLinkler = document.querySelectorAll("a");
            tumLinkler.forEach(link => {
                if(link.innerText.includes("Listeye") || link.innerText.includes("Geri")) {
                    link.href = donulecekSayfa;
                }
            });
        }, 1000);

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
    if (!dosyaAdi) {
        console.error("HATA TESPİT EDİLDİ: 'DOSYA_ESLESTIRME' nesnesinde bu test için bir dosya adı tanımlanmamış.");
        document.getElementById("soru-alani").innerHTML = `
            <div style="background:#4d1a1a; border:2px solid #ff0000; padding:15px; color:#fff;">
                <h2 style="color:#ffcc00;">⚠️ Nokta Atışı Hata Tespiti</h2>
                <p><strong>Sorun:</strong> script.js içinde dosya yolu eksik.</p>
                <p><strong>Dosya:</strong> script.js</p>
                <p><strong>Satır Tahmini:</strong> 'DOSYA_ESLESTIRME' bloğunun içi.</p>
                <p><strong>Çözüm:</strong> Bu testin ID'sini DOSYA_ESLESTIRME nesnesine eklemelisin.</p>
            </div>`;
        return;
    }
    const url = JSON_PATH + dosyaAdi;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Dosya yüklenemedi: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const ustBaslikObj = Array.isArray(data) ? data[0] : data;
            if (ustBaslikObj) {
                const testler = ustBaslikObj.tests || data.tests;
                if (testler) {
                    const istenenTest = testler[testNo - 1];
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
            }
        })
        .catch(error => {
            console.error("Hata:", error);
            const soruAlani = document.getElementById("soru-alani");
            soruAlani.innerHTML = `<div style="text-align:center; padding:20px; color:#ff0000;"><div class="baslik-h2-gibi">Yükleme Hatası</div><p>Veri dosyası okunamadı.</p><a href="testler.html" class="aksiyon-butonu">Listeye Dön</a></div>`;
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
    soruSayacElement.setAttribute("role", "heading"); 
    soruSayacElement.setAttribute("aria-level", "2"); 
    soruSayacElement.setAttribute("tabindex", "-1"); // ERİŞİLEBİLİRLİK: Odaklanma için eklendi

    // --- SESLİ GERİ BİLDİRİM KONTROLÜ (ONAY KUTUSU) ---
    if (!document.getElementById("tts-kontrol-alani")) {
        const kontrolDiv = document.createElement("div");
        kontrolDiv.id = "tts-kontrol-alani";
        kontrolDiv.style.cssText = "background:#1a1a1a; padding:10px; border:1px solid #ffff00; border-radius:8px; margin-bottom:15px;";
        kontrolDiv.innerHTML = `
            <input type="checkbox" id="tts-kapali-check" style="width:20px; height:20px; cursor:pointer;">
            <label for="tts-kapali-check" style="color:#ffff00; font-weight:bold; font-size:1.1rem; margin-left:10px; cursor:pointer;">
                Sadece Ses Efekti Çal (Konuşmayı Kapat)
            </label>
        `;
        soruSayacElement.parentNode.insertBefore(kontrolDiv, soruSayacElement);
    }

    const soruBaslik = document.getElementById("soru-metni");
    soruBaslik.removeAttribute('aria-hidden'); 
    soruBaslik.setAttribute("role", "presentation"); 
    
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
        onculHTML += `<ul class='oncul-kapsayici' style="margin: 10px 0; list-style:none; padding:0;" role="list" aria-label="Öncüller">`; 
        soruObj.onculler.forEach(oncul => {
            const match = oncul.match(/^(\d+\.?|[IVX]+\.?|\w\.?)\s*(.*)/);
            onculHTML += `<li class='oncul-satir' style="margin-bottom:8px; padding: 5px; border-left: 2px solid #ffff00;" role="listitem">
                <span class='oncul-no' style="font-weight:bold; margin-right:10px;">${match ? match[1] : ''}</span>
                <span class='oncul-yazi'>${match ? match[2] : oncul}</span>
            </li>`;
            toplamMetinKontrol += oncul;
        });
        onculHTML += `</ul>`;
    }

    let soruKokuHTML = "";
    if (soruObj.soruKoku) {
        soruKokuHTML = `<p class='soru-koku-vurgu' style="font-weight:bold; margin-top:15px; color:#ffff00;">${soruObj.soruKoku}</p>`;
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
        let temizSik = sik.replace(/^[A-Ea-e][\)\.]\s*/, "");

        btn.innerText = harf + ") " + temizSik;
        btn.className = "sik-butonu";
        btn.setAttribute("aria-label", `${harf} şıkkı: ${temizSik}`); 

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
    
    // ERİŞİLEBİLİRLİK: Sayfa yüklendiğinde veya soru değiştiğinde sayaca odaklan
    setTimeout(() => { soruSayacElement.focus(); }, 100);
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
    const dogruCevapIndex = mevcutSorular[mevcutSoruIndex].secenekler
        .findIndex((_, i) => getSikHarfi(i) === dogruCevapHarf);
    const dogruCevapMetni = dogruCevapIndex !== -1 
        ? mevcutSorular[mevcutSoruIndex].secenekler[dogruCevapIndex] 
        : "Bilinmiyor";

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

    let konusulacakMetin = "";
    if (dogruMu) {
        konusulacakMetin = `Doğru! Cevabınız ${secilenSikHarfi}, ${secilenCevapMetni}.`;
    } else {
        konusulacakMetin = `Yanlış. Siz ${secilenSikHarfi} dediniz. Doğru cevap ${dogruCevapHarf}, ${dogruCevapMetni}.`;
    }
    
    const mobilMi = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const ttsKapali = document.getElementById("tts-kapali-check")?.checked;

    if (mobilMi) {
        sesUret(dogruMu ? 'dogru' : 'yanlis');
        if (!ttsKapali) {
            const okuma = metniOkuBekle(konusulacakMetin);
            const kilit = new Promise(r => setTimeout(r, 4000));
            await Promise.race([okuma, kilit]);
        }
    } else {
        if (dogruMu) { await sesCalBekle('dogru'); } else { await sesCalBekle('yanlis'); }
        if (!ttsKapali) {
            await new Promise(r => setTimeout(r, 300));
            await metniOkuBekle(konusulacakMetin);
        }
    }

    if (mevcutSoruIndex < mevcutSorular.length - 1) {
        sonrakiSoru(); 
    } else {
        testiBitir();
    }
}

function getSikHarfi(index) { return ["A", "B", "C", "D", "E"][index]; }

function formatSoruMetni(soruObj) {
    let finalHTML = "";
    if (soruObj.onculGiris) finalHTML += `<p class="soru-giris" style="margin-bottom:10px;">${soruObj.onculGiris}</p>`;
    if (soruObj.soru && soruObj.soru !== soruObj.onculGiris) finalHTML += `<p class="soru-ana-metin" style="margin-bottom:10px;">${soruObj.soru}</p>`;

    let onculHTML = "";
    if (soruObj.onculler && soruObj.onculler.length > 0) {
        onculHTML += `<ul class='oncul-kapsayici' style="margin: 10px 0; list-style:none; padding:0;">`; 
        soruObj.onculler.forEach(oncul => {
            const match = oncul.match(/^(\d+\.?|\w\.?)\s*(.*)/);
            onculHTML += `<li class='oncul-satir' style="margin-bottom:5px;"><span class='oncul-no' style="font-weight:bold; margin-right:5px;">${match ? match[1] : ''}</span><span class='oncul-yazi'>${match ? match[2] : oncul}</span></li>`;
        });
        onculHTML += `</ul>`;
    }

    let soruKokuHTML = "";
    if (soruObj.soruKoku) soruKokuHTML += `<p class='soru-koku-vurgu' style="font-weight:bold; margin-top:10px;">${soruObj.soruKoku}</p>`;

    const yerlesim = soruObj.oncul_yerlesim || "ONCE_KOK"; 
    if (yerlesim === "ONCE_KOK") finalHTML += onculHTML + soruKokuHTML; 
    else finalHTML += soruKokuHTML + onculHTML;

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
    const urlParams = new URLSearchParams(window.location.search);
    const testParam = urlParams.get('id');
    const isTurkishTest = testParam && testParam.startsWith('paragraf'); 

    let hedefDiv = document.getElementById("sonuc-alani");
    let container = document.getElementById("cevap-anahtari-konteyner");
    if (!container) {
        container = document.createElement("div");
        container.id = "cevap-anahtari-konteyner";
        container.className = "cevap-anahtari-kapsayici";
        container.style.marginTop = "20px";
        hedefDiv.appendChild(container);
    }
    container.innerHTML = "";

    const baslik = document.createElement("h2");
    baslik.innerText = "CEVAP ANAHTARI VE DETAYLI ÇÖZÜMLER";
    baslik.style.cssText = "text-align:center; color:#ffff00; margin-bottom:20px;";
    baslik.setAttribute("tabindex", "0");
    container.appendChild(baslik);

    if (isTurkishTest) {
        mevcutCozumIndex = 0; 
        gosterTurkceCozum(mevcutCozumIndex, container);
    } else {
        mevcutSorular.forEach((soru, index) => {
            const kullaniciSecimiIndex = kullaniciCevaplari[index];
            const dogruCevapHarfi = soru.dogru_cevap;
            const kart = document.createElement("div");
            kart.className = "sonuc-karti";
            kart.style.cssText = "border: 1px solid #444; padding: 15px; margin-bottom: 20px; background: #222; border-radius: 8px;";
            
            let soruMetniHTML = `<h3 style="color:#fff; margin-bottom:10px;" tabindex="0">Soru ${index + 1}</h3>`;
            soruMetniHTML += `<div style="color:#eee; margin-bottom:15px; font-size:1.1rem;" tabindex="0">${formatSoruMetni(soru)}</div>`;
            
            let siklarHTML = `<div class="cevap-siklari-listesi" style="display:flex; flex-direction:column; gap:10px;">`;
            soru.secenekler.forEach((sikMetni, i) => {
                const harf = getSikHarfi(i);
                const buSikSecildi = (i === kullaniciSecimiIndex);
                let arkaPlanRengi = "#333"; let kenarlik = "1px solid #555"; let durumMetni = "";
                
                if (buSikSecildi) {
                    arkaPlanRengi = harf === dogruCevapHarfi ? "#1a4d1a" : "#4d1a1a"; 
                    kenarlik = harf === dogruCevapHarfi ? "2px solid #00ff00" : "2px solid #ff0000";
                    durumMetni = harf === dogruCevapHarfi ? "(Sizin cevabınız - DOĞRU)" : "(Sizin cevabınız - YANLIŞ)";
                } else if (harf === dogruCevapHarfi) {
                    arkaPlanRengi = "#005500"; kenarlik = "2px solid #00ff00"; durumMetni = "(Doğru Cevap)"; 
                }
                
                siklarHTML += `
                    <div style="background:${arkaPlanRengi}; border:${kenarlik}; padding:10px; border-radius:5px; color:#fff;" tabindex="0" aria-label="${harf} şıkkı: ${sikMetni}. ${durumMetni}">
                        <span style="font-weight:bold; color:#ffcc00;">${harf})</span> ${sikMetni} 
                        <span style="font-weight:bold; float:right; font-size:0.9rem;">${durumMetni}</span>
                    </div>`;
            });
            siklarHTML += `</div>`;

            let dogruCevapMetni = "";
            soru.secenekler.forEach((s, k) => { if(getSikHarfi(k) === dogruCevapHarfi) dogruCevapMetni = s; });

            const altBilgiHTML = `
                <div style="margin-top:20px; padding-top:15px; border-top:1px dashed #666;">
                    <p tabindex="0" style="color:#00ff00; font-weight:bold; margin-bottom:5px;">✅ Doğru Cevap: ${dogruCevapHarfi}) ${dogruCevapMetni}</p>
                    <div tabindex="0" style="background:#333; padding:10px; border-left:4px solid #ffff00; margin-top:10px; color:#ddd;">
                        <strong>💡 Açıklama:</strong><br>${soru.aciklama || "Bu soru için açıklama bulunmuyor."}
                    </div>
                </div>`;
            kart.innerHTML = soruMetniHTML + siklarHTML + altBilgiHTML;
            container.appendChild(kart);
        });
    }
    container.scrollIntoView();
    baslik.focus();
}

function gosterTurkceCozum(index, container) {
    container.innerHTML = ""; 
    mevcutCozumIndex = index;
    const soru = mevcutSorular[index];
    const kullaniciSecimiIndex = kullaniciCevaplari[index];
    const dogruCevapHarfi = soru.dogru_cevap;
    const kullaniciSecimiHarfi = kullaniciSecimiIndex !== null ? getSikHarfi(kullaniciSecimiIndex) : null;

    const kart = document.createElement("div");
    kart.className = "sonuc-karti-turkce";
    kart.style.cssText = "border: 1px solid #444; padding: 20px; margin-bottom: 20px; background: #222; border-radius: 8px;";
    
    let durum = ""; let durumRengi = "#ffcc00"; 
    if (kullaniciSecimiHarfi === dogruCevapHarfi) { durum = "✅ Doğru Cevapladınız!"; durumRengi = "#00ff00"; }
    else if (kullaniciSecimiHarfi !== null) { durum = "❌ Yanlış Cevapladınız!"; durumRengi = "#ff0000"; }
    else { durum = "❓ Boş Bıraktınız."; }

    let soruMetniHTML = `<h3 style="color:${durumRengi}; margin-bottom:15px;" tabindex="-1">Soru ${index + 1}: ${durum}</h3>`;
    soruMetniHTML += `<div style="color:#eee; margin-bottom:15px; font-size:1.1rem; border-bottom:1px solid #555; padding-bottom:10px;" role="presentation">${formatSoruMetni(soru)}</div>`;
    
    let siklarHTML = `<p style="font-weight:bold; color:#ffcc00; margin-bottom:10px;">Şıklar:</p>`;
    siklarHTML += `<div class="cevap-siklari-listesi-turkce" style="display:flex; flex-direction:column; gap:10px;">`;
    
    soru.secenekler.forEach((sikMetni, i) => {
        const harf = getSikHarfi(i);
        const buSikSecildi = (i === kullaniciSecimiIndex);
        let temizSik = sikMetni.replace(/^[A-Ea-e][\)\.]\s*/, "");
        let arkaPlanRengi = "#333"; let kenarlik = "1px solid #555"; let durumMetni = ""; 
        
        if (buSikSecildi) {
            arkaPlanRengi = harf === dogruCevapHarfi ? "#1a4d1a" : "#4d1a1a"; 
            kenarlik = harf === dogruCevapHarfi ? "2px solid #00ff00" : "2px solid #ff0000";
            durumMetni = harf === dogruCevapHarfi ? "(Sizin cevabınız - DOĞRU)" : "(Sizin cevabınız - YANLIŞ)";
        } else if (harf === dogruCevapHarfi) {
            arkaPlanRengi = "#005500"; kenarlik = "2px solid #00ff00"; durumMetni = "(Doğru Cevap)"; 
        }

        siklarHTML += `
            <div style="background:${arkaPlanRengi}; border:${kenarlik}; padding:10px; border-radius:5px; color:#fff;" tabindex="0" aria-label="${harf} şıkkı: ${temizSik}. ${durumMetni}">
                <span style="font-weight:bold; color:#ffcc00;">${harf})</span> ${temizSik} 
                <span style="font-weight:bold; float:right; font-size:0.9rem;">${durumMetni}</span>
            </div>`;
    });
    siklarHTML += `</div>`;

    const aciklamaHTML = `
        <div style="margin-top:20px; padding-top:15px; border-top:1px dashed #666;">
            <h4 style="color:#ffff00; margin-bottom:5px;">💡 Detaylı Çözüm:</h4>
            <div tabindex="0" style="background:#333; padding:10px; border-left:4px solid #ffff00; margin-top:5px; color:#ddd;">
                ${soru.aciklama || "Bu soru için açıklama bulunmuyor."}
            </div>
        </div>`;

    const navHTML = `
        <div class="navigasyon-cozum" style="display:flex; gap:20px; margin-top:20px;">
            <button class="nav-buton" onclick="oncekiTurkceCozum()" style="flex:1;" ${mevcutCozumIndex === 0 ? 'disabled' : ''}>&lt; Önceki Soru</button>
            <button class="nav-buton" onclick="sonrakiTurkceCozum()" style="flex:1;">
                ${mevcutCozumIndex < mevcutSorular.length - 1 ? 'Sonraki Soru &gt;' : 'Çözümleri Bitir'}
            </button>
        </div>`;
    
    kart.innerHTML = soruMetniHTML + siklarHTML + aciklamaHTML + navHTML;
    container.appendChild(kart);
    kart.querySelector('h3').focus();
}

function testiBitirCozum() {
    const sonucDiv = document.getElementById("puan-detay");
    const container = document.getElementById("cevap-anahtari-konteyner");
    if (sonucDiv) sonucDiv.style.display = 'block';
    if (container) container.innerHTML = "";
    document.querySelector('#puan-detay button').focus(); 
}

function oncekiTurkceCozum() {
    const container = document.getElementById("cevap-anahtari-konteyner");
    if (container && mevcutCozumIndex > 0) gosterTurkceCozum(mevcutCozumIndex - 1, container);
}

function sonrakiTurkceCozum() {
    const container = document.getElementById("cevap-anahtari-konteyner");
    if (container && mevcutCozumIndex < mevcutSorular.length - 1) gosterTurkceCozum(mevcutCozumIndex + 1, container);
    else if (mevcutCozumIndex === mevcutSorular.length - 1) testiBitirCozum();
}