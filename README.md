# Gecekondu Event — 3D Site

Açmak için: `index.html` dosyasına çift tıklayın (internet gerekmez).

## Yapı
- **Arka plan:** `İNSTAGRAM İÇERİĞİ/gecekondu1.mp4` drone çekimi, 179 kareye bölündü (`assets/frames`, mobil için `assets/frames-m`). Sayfa kaydırıldıkça film gün batımından gece havai fişeklerine ilerler; fare ile 3D eğilir. Üstünde Three.js ışık parçacıkları (bokeh) var.
- **Anlar (3D tünel):** Gerçek fotoğrafların arasından ileri uçuş.
- **Mekânlar (üçgen prizma):** Üçgen Ev · Şömineli Loca · Klasik Arabalar, kaydırdıkça döner.
- **Galeri:** 3D döner halka + büyütme.
- **Instagram hazır mesaj:** Ziyaretçi organizasyon, tarih ve davetli sayısını girer; mesaj canlı bir DM önizlemesinde oluşur. "Instagram'dan Gönder" düğmesi metni otomatik panoya kopyalar, bağlantıya ekler (`?text=`) ve @gecekonduevent DM'ini açar (otomatik asistan anında yanıtlar). Sitedeki tüm yönlendirmeler Instagram'a gider; telefon yalnızca altbilgide.

- **Mavi kelebek:** `js/butterfly.js` (Three.js). Girişteki "Kaydırın, gece başlasın" düğmesinde konmuş başlar, kaydırdıkça bölümleri takip ederek ışıltı bırakır; formda Organizasyon kutusuna konar, doldurulan alanların üstünde uçar, form tamamlanınca "Instagram'dan Gönder" düğmesinin sağ üst köşesine konar. Hareket azaltma tercihi açık cihazlarda gösterilmez.

## Değiştirilecek yerler
- Instagram hesabı: `js/app.js` başındaki `CONFIG.instagram`.
- Telefon: `index.html` altbilgisindeki `tel:` bağlantısı ve görünen numara.
- Hazır mesaj metni: `js/app.js` içindeki `INTRO`, `ASK` ve `buildMsg`.
- Tünel / galeri fotoğrafları: `js/app.js` içindeki `TUNNEL` ve `PHOTOS` listeleri (`assets/images` içindeki dosya adları, `-sm/-lg` eki olmadan).

## Yayına alma
Klasörün tamamını herhangi bir statik hostinge (Netlify, Vercel, cPanel) yükleyin.

## Instagram botu bağlantısı
Düğmeler, form bilgisini Meta'nın resmî `ref` parametresiyle (`gsite1_` + base64url JSON) bota iletir. Botun bu bilgiyi okuyup kişiye özel yanıt vermesi için `Gecekondu/DM-Bot-Site-Eklentisi/` klasöründeki eklenti kurulmalıdır (bkz. KURULUM.md).
