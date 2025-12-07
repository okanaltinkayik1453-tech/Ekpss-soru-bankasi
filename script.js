// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;

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
    "guncel": "guncelbilgiler.json"
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

// --- TEST YÖNETİMİ ---
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const testParam = urlParams.get('id'); 
    
    if (testParam) {
        const onEk = testParam.substring(0, testParam.lastIndexOf('_'));
        const dosyaAdi = DOSYA_ESLESTIRME[onEk];
        const testNoStr = testParam.substring(testParam.lastIndexOf('_') + 5); 
        const testNo = parseInt(testNoStr); 
        
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
function cevapIsaretle(secilenIndex, btnElement) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true;
    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    
    const dogruCevapHarf = mevcutSorular[mevcutSoruIndex].dogru_cevap; 
    const secilenCevapHarf = getSikHarfi(secilenIndex); 
    const dogruMu = (secilenCevapHarf === dogruCevapHarf);

    const uyariKutusu = document.getElementById("sesli-uyari");
    const gorselUyari = document.getElementById("gorsel-uyari-alani");

    // 1. ADIM: VoiceOver için anında metinsel geri bildirim
    gorselUyari.innerText = dogruMu ? "DOĞRU CEVAP!" : "YANLIŞ CEVAP!";
    gorselUyari.className = `gorsel-uyari-kutusu ${dogruMu ? 'uyari-dogru' : 'uyari-yanlis'}`;
    gorselUyari.style.display = "block";

    if (uyariKutusu) {
        uyariKutusu.setAttribute("role", "alert"); 
        uyariKutusu.setAttribute("aria-live", "assertive"); 
        uyariKutusu.innerText = dogruMu ? "Doğru bildiniz." : `Yanlış. Doğru cevap ${dogruCevapHarf} şıkkıydı.`;
    }

    if (dogruMu) {
        btnElement.classList.add("dogru"); 
    } else {
        btnElement.classList.add("yanlis"); 
        const dogruButon = Array.from(document.querySelectorAll(".sik-butonu")).find(b => b.innerText.startsWith(dogruCevapHarf + ")"));
        if(dogruButon) dogruButon.classList.add("dogru");
    }

    // 2. ADIM: Ses çakışmasını önlemek için 500ms gecikme ile ses çalma
    setTimeout(() => {
        sesUret(dogruMu ? "dogru" : "yanlis");
    }, 500);

    // 3. ADIM: Bir sonraki soruya geçiş
    setTimeout(() => {
        if (uyariKutusu) uyariKutusu.innerText = ""; 
        gorselUyari.style.display = "none";
        if (mevcutSoruIndex < mevcutSorular.length - 1) {
            sonrakiSoru(); 
        } else {
            sesUret("bitis");
            gorselUyari.className = "gorsel-uyari-kutusu"; 
            gorselUyari.style.display = "block";
            gorselUyari.style.backgroundColor = "#000"; 
            gorselUyari.innerText = "TEST BİTTİ";
        }
    }, 3000);  
}

function getSikHarfi(index) { return ["A", "B", "C", "D", "E"][index]; }

function testiBitir() {
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
    `;
    document.getElementById("puan-detay").innerHTML = sonucHTML;
}

function cevapAnahtariniGoster() {
    const listeDiv = document.getElementById("yanlis-detaylari");
    listeDiv.innerHTML = "";
    document.getElementById("yanlislar-listesi").style.display = "block";
    mevcutSorular.forEach((soru, index) => {
        const kullaniciCevabiIndex = kullaniciCevaplari[index];
        const dogruCevapHarf = soru.dogru_cevap;
        const kart = document.createElement("div"); 
        kart.className = "yanlis-soru-karti";
        const secilenCevapHarf = kullaniciCevabiIndex !== null ? getSikHarfi(kullaniciCevaplari[index]) : 'Boş';
        kart.innerHTML = `
            <div style="border-bottom:1px solid #444; padding-bottom:10px;">
                <p>Soru ${index + 1} - Sizin Cevabınız: ${secilenCevapHarf}</p>
                <p style="color:#00ff00;">Doğru Cevap: ${dogruCevapHarf}</p>
                <p>Açıklama: ${soru.aciklama || 'Yok'}</p>
            </div>`;
        listeDiv.appendChild(kart);
    });
}