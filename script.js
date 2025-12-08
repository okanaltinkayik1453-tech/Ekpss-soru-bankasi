// --- DEĞİŞKENLER ---
let mevcutSorular = []; 
let mevcutSoruIndex = 0;
let kullaniciCevaplari = [];
let isaretlemeKilitli = false;

// Cihazın Mobil olup olmadığını algıla
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

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
    bitis: new Audio('bitis.mp3'),
    kilit: new Audio('kilit.mp3') // Klasörde kilit.mp3 olduğundan emin ol
};

// Ses Seviyeleri
sesler.dogru.volume = 1.0; 
sesler.yanlis.volume = 0.3; 
sesler.bitis.volume = 0.3; 
sesler.kilit.volume = 0.8; 

function sesUret(tur) {
    // MOBİL KISITLAMASI: 
    // Mobilde 'dogru' ve 'yanlis' sesleri VoiceOver ile çakışmaması için kapatıldı.
    // Sadece 'kilit' (tıklama anı) ve 'bitis' çalacak.
    if (isMobile && (tur === "dogru" || tur === "yanlis")) return;

    if (sesler[tur]) {
        sesler[tur].pause();
        sesler[tur].currentTime = 0;
        sesler[tur].play().catch(e => console.log("Ses hatası (Dosya eksik olabilir):", e));
    }
}

// --- TASARIM STİLLERİ (Testi Bitir Butonu İçin) ---
const style = document.createElement('style');
style.innerHTML = `
    .bitir-ozel {
        background-color: #28a745 !important; /* Yeşil */
        color: white !important;
        font-weight: bold !important;
        font-size: 1.1rem !important;
        border: 2px solid #218838 !important;
        box-shadow: 0 0 10px rgba(40, 167, 69, 0.5);
    }
    .bitir-ozel:hover, .bitir-ozel:focus {
        background-color: #218838 !important;
        transform: scale(1.02);
    }
`;
document.head.appendChild(style);


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
             hataGoster("Test ID Hatası", "Lütfen ID'yi kontrol edin.");
        }
    } else {
        hataGoster("Test Seçilmedi", "Test listesine yönlendiriliyorsunuz...");
    }
});

function hataGoster(baslik, mesaj) {
    const soruAlani = document.getElementById("soru-alani");
    if(soruAlani) {
         soruAlani.innerHTML = `<div style="text-align:center; padding:20px;"><div class="baslik-h2-gibi">${baslik}</div><p>${mesaj}</p><a href="testler.html" class="aksiyon-butonu">Listeye Dön</a></div>`;
         if(document.querySelector(".test-ust-bar")) document.querySelector(".test-ust-bar").style.display = "none";
    }
}

function testiYukle(dosyaAdi, testNo) {
    const url = JSON_PATH + dosyaAdi;
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`Dosya yüklenemedi: ${response.statusText}`);
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
                    hataGoster("Test Bulunamadı", "Bu test henüz eklenmemiş olabilir.");
                }
            } else {
                 hataGoster("Veri Hatası", "Test verisi okunamadı.");
            }
        })
        .catch(error => {
            console.error("Hata:", error);
            hataGoster("Yükleme Hatası", "Veri dosyası okunamadı. İnternet bağlantınızı kontrol edin.");
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
    if(uyariKutusu) {
        uyariKutusu.innerText = "";
        // Yeni soruya geçince aria-live temizlenir
        uyariKutusu.removeAttribute("role");
        uyariKutusu.removeAttribute("aria-live");
    }
    
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

    // HTML İÇERİĞİ OLUŞTURMA
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

    // ŞIKLARI OLUŞTURMA
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
        // VoiceOver için
        btn.setAttribute("aria-label", `${harf} şıkkı, ${sik}. Seçmek için çift dokunun.`); 
        if (kullaniciCevaplari[index] !== null) {
            if (harf === getSikHarfi(kullaniciCevaplari[index])) {
                btn.classList.add(harf === soruObj.dogru_cevap ? "dogru" : "yanlis");
            }
            btn.disabled = true;
        }
        btn.onclick = () => cevapIsaretle(i, btn);
        siklarKutusu.appendChild(btn);
    });

    // NAVİGASYON BUTONLARI GÜNCELLEME
    document.getElementById("btn-onceki").disabled = (index === 0);
    
    const btnSonraki = document.getElementById("btn-sonraki");
    if (index === mevcutSorular.length - 1) {
        btnSonraki.innerText = "TESTİ BİTİR";
        btnSonraki.classList.add("bitir-ozel"); 
        btnSonraki.onclick = testiBitir; 
        btnSonraki.disabled = false;
    } else {
        btnSonraki.innerText = "Sonraki >";
        btnSonraki.classList.remove("bitir-ozel");
        btnSonraki.onclick = sonrakiSoru;
        btnSonraki.disabled = false;
    }

    if (kullaniciCevaplari[index] === null) soruSayacElement.focus();
}

// --- AKILLI CEVAP İŞARETLEME (PC ve MOBİL AYRIŞTIRILMIŞ) ---
function cevapIsaretle(secilenIndex, btnElement) {
    if (isaretlemeKilitli) return;
    isaretlemeKilitli = true;
    kullaniciCevaplari[mevcutSoruIndex] = secilenIndex;
    
    const dogruCevapHarf = mevcutSorular[mevcutSoruIndex].dogru_cevap; 
    const secilenCevapHarf = getSikHarfi(secilenIndex); 
    const dogruMu = (secilenCevapHarf === dogruCevapHarf);

    const dogruIndex = ["A", "B", "C", "D", "E"].indexOf(dogruCevapHarf);
    const dogruSikMetni = mevcutSorular[mevcutSoruIndex].secenekler[dogruIndex];

    const uyariKutusu = document.getElementById("sesli-uyari");
    const gorselUyari = document.getElementById("gorsel-uyari-alani");

    // Okunacak Metin (Noktalama işaretleri ile es verdik)
    let bildirimMetni = "";
    if (dogruMu) {
        bildirimMetni = `Doğru! İşaretlediğiniz şık ${dogruCevapHarf}. ${dogruSikMetni}.`;
    } else {
        bildirimMetni = `Yanlış. Sizin cevabınız ${secilenCevapHarf}. Doğru cevap ${dogruCevapHarf} şıkkı: ${dogruSikMetni}.`;
    }

    // GÖRSEL GERİ BİLDİRİM (HEMEN)
    if(gorselUyari) {
        gorselUyari.innerText = dogruMu ? "DOĞRU CEVAP!" : "YANLIŞ CEVAP!";
        gorselUyari.className = `gorsel-uyari-kutusu ${dogruMu ? 'uyari-dogru' : 'uyari-yanlis'}`;
        gorselUyari.style.display = "block";
    }

    // BUTON RENKLENDİRME
    if (dogruMu) {
        btnElement.classList.add("dogru"); 
    } else {
        btnElement.classList.add("yanlis"); 
        const dogruButon = Array.from(document.querySelectorAll(".sik-butonu")).find(b => b.innerText.startsWith(dogruCevapHarf + ")"));
        if(dogruButon) dogruButon.classList.add("dogru");
    }

    // --- SES VE OKUMA SENARYOLARI ---

    if (isMobile) {
        // --- SENARYO 1: MOBİL (iPhone/Android) ---
        // Strateji: Önce tık sesi, 600ms bekle, sonra konuş, sonra hızlı geç.
        
        sesUret("kilit"); // Tık sesi

        // Ekran okuyucu kuyruğunu temizle
        if (uyariKutusu) {
            uyariKutusu.innerText = "";
            uyariKutusu.removeAttribute("role");
            uyariKutusu.removeAttribute("aria-live");
        }

        setTimeout(() => {
            // Ses bittikten sonra metni gönderiyoruz
            if (uyariKutusu) {
                uyariKutusu.setAttribute("role", "alert");
                uyariKutusu.setAttribute("aria-live", "assertive");
                uyariKutusu.innerText = bildirimMetni; 
            }

            // HIZLI GEÇİŞ AYARI
            // Harf başına 90ms (daha seri) + 1000ms (1 saniye) sabit bekleme
            const mobilOkumaSuresi = (bildirimMetni.length * 90) + 1000;

            setTimeout(() => {
                temizlikVeGecis();
            }, mobilOkumaSuresi);

        }, 600); // Tık sesinin bitmesi için bekleme

    } else {
        // --- SENARYO 2: BİLGİSAYAR (PC/Web) ---
        // Strateji: Önce ses efekti (Doğru/Yanlış) çalsın.
        // O sırada ekran okuyucuya HİÇBİR ŞEY gönderme.
        // Ses bitsin (1 sn), sonra metni gönder. Böylece asla karışmaz.

        sesUret(dogruMu ? "dogru" : "yanlis");

        // Metni hemen yazma! Önce temizle.
        if (uyariKutusu) {
            uyariKutusu.innerText = "";
            uyariKutusu.removeAttribute("role");
        }

        setTimeout(() => {
            // 1.000 ms (1 saniye) sonra ses efekti biter, şimdi okutuyoruz.
            if (uyariKutusu) {
                uyariKutusu.setAttribute("role", "alert"); 
                uyariKutusu.setAttribute("aria-live", "assertive"); 
                uyariKutusu.innerText = bildirimMetni; 
            }

            // PC okuma süresi hesaplama
            const pcOkumaSuresi = (bildirimMetni.length * 70) + 1200;

            setTimeout(() => {
                temizlikVeGecis();
            }, pcOkumaSuresi);

        }, 1000); // Ses efekti için 1 saniye bekleme payı
    }
}

// Kod tekrarını önlemek için ortak temizlik ve geçiş fonksiyonu
function temizlikVeGecis() {
    const uyariKutusu = document.getElementById("sesli-uyari");
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    
    if (uyariKutusu) uyariKutusu.innerText = ""; 
    if (gorselUyari) gorselUyari.style.display = "none";
    
    if (mevcutSoruIndex < mevcutSorular.length - 1) {
        sonrakiSoru(); 
    } else {
        testiBitirKismi(); 
    }
}

function getSikHarfi(index) { return ["A", "B", "C", "D", "E"][index]; }

// Yardımcı fonksiyon: Test bittiğinde çağrılır
function testiBitirKismi() {
    sesUret("bitis");
    const gorselUyari = document.getElementById("gorsel-uyari-alani");
    if(gorselUyari) {
        gorselUyari.className = "gorsel-uyari-kutusu"; 
        gorselUyari.style.display = "block";
        gorselUyari.style.backgroundColor = "#000"; 
        gorselUyari.innerText = "TEST BİTTİ";
    }
    const btnSonraki = document.getElementById("btn-sonraki");
    if (btnSonraki) btnSonraki.focus();
}

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
    if(document.getElementById("bitir-buton")) document.getElementById("bitir-buton").style.display = "none"; 
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
    
    const yanlislarListesi = document.getElementById("yanlislar-listesi");
    if(yanlislarListesi) yanlislarListesi.style.display = "block";

    mevcutSorular.forEach((soru, index) => {
        const kullaniciIdx = kullaniciCevaplari[index];
        const dogruCevapHarf = soru.dogru_cevap;
        
        const kullaniciCevapHarf = kullaniciIdx !== null ? getSikHarfi(kullaniciIdx) : "Boş";
        const kullaniciMetin = kullaniciIdx !== null ? soru.secenekler[kullaniciIdx] : "İşaretlenmedi";

        const dogruIndex = ["A", "B", "C", "D", "E"].indexOf(dogruCevapHarf);
        const dogruMetin = soru.secenekler[dogruIndex];

        let durumMetni = "";
        let durumRenk = "";
        let kartSinirRengi = "";

        if (kullaniciCevapHarf === "Boş") {
            durumMetni = "(BOŞ)";
            durumRenk = "#FFA500"; 
            kartSinirRengi = "#FFA500";
        } else if (kullaniciCevapHarf === dogruCevapHarf) {
            durumMetni = "(DOĞRU)";
            durumRenk = "#00FF00"; 
            kartSinirRengi = "#00FF00";
        } else {
            durumMetni = "(YANLIŞ)";
            durumRenk = "#FF0000"; 
            kartSinirRengi = "#FF0000";
        }

        let soruIcerikHTML = "";
        if (soru.onculGiris) soruIcerikHTML += `<p style="margin-bottom:5px;">${soru.onculGiris}</p>`;
        if (soru.soru) soruIcerikHTML += `<p style="margin-bottom:5px;">${soru.soru}</p>`;
        if (soru.onculler && soru.onculler.length > 0) {
            soruIcerikHTML += '<ul style="list-style:none; padding-left:0; margin:5px 0;">';
            soru.onculler.forEach(onc => soruIcerikHTML += `<li>${onc}</li>`);
            soruIcerikHTML += '</ul>';
        }
        if (soru.soruKoku) soruIcerikHTML += `<p style="font-weight:bold; margin-top:5px;">${soru.soruKoku}</p>`;

        const kart = document.createElement("div");
        kart.className = "sonuc-karti";
        kart.style.cssText = `
            background-color: #1a1a1a;
            border: 2px solid ${kartSinirRengi};
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 25px;
            color: #ffffff;
            font-family: sans-serif;
            box-shadow: 0 4px 8px rgba(0,0,0,0.5);
        `;

        let cevapKismiHTML = `
            <div style="margin-top:15px; border-top:1px solid #444; padding-top:15px;">
                <p style="font-size:1.1rem; margin-bottom:10px;">
                    Sizin Cevabınız: <strong>${kullaniciCevapHarf}) ${kullaniciMetin}</strong>
                    <span style="color:${durumRenk}; font-weight:bold; margin-left:10px;">${durumMetni}</span>
                </p>
                
                <p style="color:#00FF00; font-weight:bold; font-size:1.1rem; margin-bottom:10px;">
                    Doğru Cevap: ${dogruCevapHarf}) ${dogruMetin}
                </p>
        `;

        if (soru.aciklama) {
            cevapKismiHTML += `
                <div style="background:#333; color:#ddd; padding:10px; border-radius:5px; margin-top:15px; border-left: 4px solid #fff;">
                    <strong>Açıklama:</strong> ${soru.aciklama}
                </div>
            `;
        }

        cevapKismiHTML += `</div>`;

        kart.innerHTML = `
            <div style="font-weight:bold; font-size:1.2rem; margin-bottom:10px; color:#aaa; border-bottom:1px solid #333; padding-bottom:5px;">SORU ${index + 1}</div>
            <div class="soru-metni-ozet" style="font-size:1rem; line-height:1.4;">${soruIcerikHTML}</div>
            ${cevapKismiHTML}
        `;

        listeDiv.appendChild(kart);
    });
}
