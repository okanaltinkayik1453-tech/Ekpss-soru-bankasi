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
    "guncel": "guncelbilgiler.json",
"karma": "karmatestler.json"
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
const testNoStr = testParam.split('_test')[1];
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
    
    const hamMetin = btnElement.innerText; 
    const secilenSikHarfi = hamMetin.charAt(0); 
    const secilenCevapMetni = hamMetin.substring(3).trim(); 

    const dogruCevapHarf = mevcutSorular[mevcutSoruIndex].dogru_cevap; 
    const dogruMu = (secilenSikHarfi === dogruCevapHarf);
    
    let dogruCevapMetni = "";
    mevcutSorular[mevcutSoruIndex].secenekler.forEach((sik, i) => {
        if(getSikHarfi(i) === dogruCevapHarf) dogruCevapMetni = sik;
    });

    if (dogruMu) {
        btnElement.classList.add("dogru"); 
        sesUret('dogru'); // EKLENDİ: Artık doğru sesi çalacak
    } else {
        btnElement.classList.add("yanlis"); 
        sesUret('yanlis'); // EKLENDİ: Artık yanlış sesi çalacak
        const butonlar = document.querySelectorAll(".sik-butonu");
        butonlar.forEach(b => {
            if(b.innerText.startsWith(dogruCevapHarf + ")")) {
                b.classList.add("dogru");
            }
        });
    }

    // Okunacak metni hazırlıyoruz
    let konusulacakMetin = "";
    if (dogruMu) {
        konusulacakMetin = `Doğru. ${secilenSikHarfi} şıkkı, ${secilenCevapMetni}.`;
    } else {
        konusulacakMetin = `Yanlış. İşaretlediğiniz ${secilenSikHarfi}, doğru cevap ${dogruCevapHarf} şıkkı, ${dogruCevapMetni}.`;
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
        // MOBİL (VOICEOVER/TALKBACK) İÇİN TARAYICI MOTORU
        window.speechSynthesis.cancel();
        let utterance = new SpeechSynthesisUtterance(konusulacakMetin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.3; // Okuma hızı
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 100);
    } else {
        // MASAÜSTÜ (NVDA/JAWS) İÇİN ARIA LIVE BÖLGESİ
        let uyariKutusu = document.getElementById("sesli-uyari");
        if (!uyariKutusu) {
            uyariKutusu = document.createElement("div");
            uyariKutusu.id = "sesli-uyari";
            // NVDA'nın metni atlamadan okuması için en sağlam ayarlar:
            uyariKutusu.setAttribute("aria-live", "assertive");
            uyariKutusu.setAttribute("aria-atomic", "true"); 
            uyariKutusu.setAttribute("role", "alert");
            // Ekran dışına atmak yerine 1 piksellik görünmez alan yapıyoruz
            uyariKutusu.style.cssText = "position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(1px, 1px, 1px, 1px); white-space:nowrap;";
            document.body.appendChild(uyariKutusu);
        }
        
        // Önce içeriği temizle, kısa süre sonra yeni metni bas (NVDA tetiklensin diye)
        uyariKutusu.innerText = ""; 
        setTimeout(() => {
            uyariKutusu.innerText = konusulacakMetin;
        }, 100);
    }

    // Soruyu geçiş süresi
    setTimeout(() => {
        const gorselUyari = document.getElementById("gorsel-uyari-alani");
        if(gorselUyari) gorselUyari.style.display = "none";
        if (mevcutSoruIndex < mevcutSorular.length - 1) {
            sonrakiSoru(); 
            if(isMobile) window.speechSynthesis.cancel();
        } else {
            testiBitir();
        }
    }, 4000); 
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
    let hedefDiv = listeDiv;
    if (!hedefDiv) {
        hedefDiv = document.getElementById("sonuc-alani");
        if(!document.getElementById("cevap-anahtari-konteyner")) {
            const container = document.createElement("div");
            container.id = "cevap-anahtari-konteyner";
            container.className = "cevap-anahtari-kapsayici";
            hedefDiv.appendChild(container);
            hedefDiv = container;
        } else {
            hedefDiv = document.getElementById("cevap-anahtari-konteyner");
        }
    }
    
    hedefDiv.innerHTML = "<h2 style='text-align:center; color:#ffff00; margin-bottom:20px;'>CEVAP ANAHTARI</h2>";
    const listeKapsayici = document.getElementById("yanlislar-listesi");
    if(listeKapsayici) listeKapsayici.style.display = "block";

    mevcutSorular.forEach((soru, index) => {
        const kullaniciIndex = kullaniciCevaplari[index];
        const dogruCevapHarf = soru.dogru_cevap;
        
        let kullaniciCevapMetni = "Boş Bırakıldı";
        let kullaniciHarf = "BOŞ";
        let dogruMu = false;

        if (kullaniciIndex !== null) {
            kullaniciHarf = getSikHarfi(kullaniciIndex);
            kullaniciCevapMetni = soru.secenekler[kullaniciIndex];
            dogruMu = (kullaniciHarf === dogruCevapHarf);
        }

        let dogruCevapIcerik = "";
        soru.secenekler.forEach((sik, i) => {
            if(getSikHarfi(i) === dogruCevapHarf) dogruCevapIcerik = sik;
        });

        const kart = document.createElement("div");
        kart.className = "sonuc-karti"; 
        
        let html = `<div class="sonuc-soru-metni" tabindex="0">Soru ${index+1}: ${soru.soruMetni || soru.soru || 'Soru Metni'}</div>`;
        
        const durumClass = dogruMu ? "durum-dogru" : "durum-yanlis";
        html += `<div class="kullanici-cevap-kutusu ${durumClass}" tabindex="0">
                    Sizin Cevabınız: ${kullaniciHarf}) ${kullaniciCevapMetni}
                 </div>`;

        if (!dogruMu) {
            html += `<div class="dogru-cevap-goster" tabindex="0">
                        Doğru Cevap: ${dogruCevapHarf}) ${dogruCevapIcerik}
                     </div>`;
        }

        if (soru.aciklama) {
            html += `<div class="aciklama-metni" tabindex="0">
                        Açıklama: ${soru.aciklama}
                     </div>`;
        }

        kart.innerHTML = html;
        hedefDiv.appendChild(kart);
    });
    
    hedefDiv.scrollIntoView();
    hedefDiv.firstChild.focus();
}