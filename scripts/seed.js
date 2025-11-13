/* prisma/seed.js */
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* =========================
   Helpers
========================= */

// Parse "50 phút/tập" hoặc "105 phút"
const parseDuration = (timeStr) => {
  if (!timeStr) return 120;
  const match = timeStr.match(/(\d+)\s*phút/);
  return match ? parseInt(match[1]) : 120;
};

// Suy đoán thể loại từ mô tả (fallback "Chính kịch")
const parseGenres = (description) => {
  if (!description) return 'Chính kịch';
  const desc = description.toLowerCase();
  if (desc.includes('tội phạm') || desc.includes('điều tra')) return 'Tội phạm, Điều tra';
  if (desc.includes('gia đình')) return 'Gia đình, Chính kịch';
  if (desc.includes('báo thù') || desc.includes('thám tử')) return 'Tội phạm, Báo thù';
  if (desc.includes('tình cảm')) return 'Tình cảm, Chính kịch';
  if (desc.includes('kinh dị') || desc.includes('tâm linh')) return 'Kinh dị, Tâm linh';
  if (desc.includes('hài')) return 'Hài, Hành động';
  if (desc.includes('hoạt hình') || desc.includes('thám tử')) return 'Hoạt hình, Thám tử';
  if (desc.includes('lịch sử')) return 'Chính kịch, Lịch sử';
  return 'Chính kịch';
};

// Suy đoán độ tuổi (fallback T13)
const parseAgeRating = (description) => {
  if (!description) return 'T13';
  const desc = description.toLowerCase();
  if (desc.includes('cưỡng bức') || desc.includes('giết người') || desc.includes('kinh hoàng')) return 'T16';
  if (desc.includes('ma quái') || desc.includes('tâm linh')) return 'T16';
  return 'T13';
};

// Slug từ tiêu đề
const slugify = (title) =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Format ngày cộng thêm d ngày
const addDaysAtHour = (date, plusDays, hour) => {
  const d = new Date(date);
  d.setDate(d.getDate() + plusDays);
  d.setHours(hour, 0, 0, 0);
  return d;
};

/* =========================
   Seed data (constants)
========================= */

const CINEMAS = [
  {
    id: 'cinema-1',
    name: 'CGV Aeon Long Biên',
    region: 'Hà Nội',
    address: 'Aeon Mall Long Biên, Hà Nội',
    latitude: 21.0285,
    longitude: 105.8542,
    logoUrl: 'https://example.com/cgv-logo.png',
    phone: '1900-6017',
  },
  {
    id: 'cinema-2',
    name: 'CGV Aeon Bình Tân',
    region: 'Hồ Chí Minh',
    address: 'Aeon Mall Bình Tân, TP.HCM',
    latitude: 10.7769,
    longitude: 106.7009,
    logoUrl: 'https://example.com/cgv-logo.png',
    phone: '1900-6017',
  },
  {
    id: 'cinema-3',
    name: 'CGV Vincom Center Landmark 81',
    region: 'Hồ Chí Minh',
    address: 'Vinhomes Central Park, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM',
    latitude: 10.7944,
    longitude: 106.7219,
    logoUrl: 'https://example.com/cgv-logo.png',
    phone: '1900-6017',
  },
  {
    id: 'cinema-4',
    name: 'CGV Vincom Royal City',
    region: 'Hà Nội',
    address: '72A Nguyễn Trãi, Thanh Xuân, Hà Nội',
    latitude: 21.0014,
    longitude: 105.8164,
    logoUrl: 'https://example.com/cgv-logo.png',
    phone: '1900-6017',
  },
  {
    id: 'cinema-5',
    name: 'CGV Crescent Mall',
    region: 'Hồ Chí Minh',
    address: '101 Tôn Dật Tiên, Tân Phú, Quận 7, TP.HCM',
    latitude: 10.7297,
    longitude: 106.7158,
    logoUrl: 'https://example.com/cgv-logo.png',
    phone: '1900-6017',
  },
];

const MOVIES_WITHOUT_TRAILER = [
  {
    id: 'movie-detective-conan',
    title: 'Detective Conan Movie 23: The Fist of Blue Sapphire',
    slug: 'detective-conan-movie-23-the-fist-of-blue-sapphire',
    description:
      'Viên sapphire xanh vĩ đại nhất thế giới, "blue lapis fist", được cho là đã bị chìm trong một con tàu cướp biển vào cuối thế kỷ 19, trên bờ biển Singapore. Một triệu phú địa phương âm mưu lấy lại nó, và khi nó được trưng bày trong một cuộc triển lãm tại khách sạn Marina Sands ở Singapore, một vụ giết người đã xảy ra.',
    summary:
      'Viên sapphire xanh vĩ đại nhất thế giới được cho là đã bị chìm trong một con tàu cướp biển vào cuối thế kỷ 19, trên bờ biển Singapore.',
    director: null,
    actors: null,
    duration: 120,
    genres: 'Hoạt hình, Thám tử',
    countries: 'Nhật Bản',
    releaseDate: new Date('2023-07-18'),
    rating: 9.5,
    ageRating: 'T13',
    posterUrl: 'https://phim.nguonc.com/public/images/Film/3383.jpg',
    backdropUrl: 'https://phim.nguonc.com/public/images/Film/3383.jpg',
    trailerUrl: null,
    formats: JSON.stringify(['2D', 'IMAX']),
    cast: null,
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: true,
  },
  {
    id: 'movie-ben-khong-chong',
    title: 'Bến Không Chồng',
    slug: 'ben-khong-chong',
    description:
      'Bến không chồng là bộ phim tình cảm Việt Nam được chuyển thể từ tiểu thuyết cùng tên của nhà văn Dương Hướng. Bộ phim là câu chuyện về làng Đông – một làng quê được đặc tả với những nét văn hóa điển hình Bắc Bộ.',
    summary:
      'Bến không chồng là bộ phim tình cảm Việt Nam được chuyển thể từ tiểu thuyết cùng tên của nhà văn Dương Hướng.',
    director: 'Lưu Trọng Ninh',
    actors: 'Như Quỳnh, Lưu Trọng Ninh, Minh Châu',
    duration: parseDuration('105 phút'),
    genres: 'Tình cảm, Chính kịch',
    countries: 'Việt Nam',
    releaseDate: new Date('2025-10-13'),
    rating: 8.2,
    ageRating: 'T13',
    posterUrl: 'https://phim.nguonc.com/public/images/Post/6/ben-khong-chong-1.jpg',
    backdropUrl: 'https://phim.nguonc.com/public/images/Post/6/ben-khong-chong.jpg',
    trailerUrl: null,
    formats: JSON.stringify(['2D']),
    cast: JSON.stringify(['Như Quỳnh', 'Lưu Trọng Ninh', 'Minh Châu']),
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: false,
  },
];

const MOVIES_WITH_TRAILER = [
  {
    id: 'movie-co-dung-hong-thoat-khoi-toi',
    title: 'Cô Đừng Hòng Thoát Khỏi Tôi',
    slug: 'co-dung-hong-thoat-khoi-toi',
    description:
      'Bộ phim khai thác chủ đề buôn người, lừa đảo trực tuyến và điều tra tội phạm xuyên biên giới. Không chỉ khắc họa cuộc đối đầu căng thẳng giữa lực lượng cảnh sát ngầm và đường dây tội phạm tinh vi, phim còn đan xen nhiều mối quan hệ phức tạp giữa yêu – hận – thù – lý tưởng.',
    summary:
      'Bộ phim khai thác chủ đề buôn người, lừa đảo trực tuyến và điều tra tội phạm xuyên biên giới.',
    director: 'Nguyễn Hoàng Anh',
    actors: 'Lê Hải, Lê Phương, Thúy Ngân, Võ Cảnh',
    duration: parseDuration('50 phút/tập'),
    genres: 'Tội phạm, Điều tra',
    countries: 'Việt Nam',
    releaseDate: new Date('2025-11-03'),
    rating: 8.5,
    ageRating: 'T16',
    posterUrl:
      'https://phim.nguonc.com/public/images/Post/10/co-dung-hong-thoat-khoi-toi.jpg',
    backdropUrl:
      'https://phim.nguonc.com/public/images/Post/10/co-dung-hong-thoat-khoi-toi-1.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=W6tYvqIO7B8',
    formats: JSON.stringify(['2D']),
    cast: JSON.stringify(['Lê Hải', 'Lê Phương', 'Thúy Ngân', 'Võ Cảnh']),
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: true,
  },
  {
    id: 'movie-cuoc-chien-ha-luu',
    title: 'Cuộc Chiến Hạ Lưu',
    slug: 'cuoc-chien-ha-luu',
    description:
      'Giữa cuộc chiến mưu sinh khốc liệt nơi đô thị hào nhoáng, một gia đình gồm già trẻ lớn bé trong một xóm nghèo bỗng đứng trước nguy cơ mất đi chốn nương thân duy nhất. Khi biến cố ập đến, quá khứ, bí mật và toan tính riêng của mỗi người dần lộ diện. Liệu họ sẽ cùng nhau vượt qua hay chính những ẩn khuất ấy sẽ xé nát mái ấm mong manh này?',
    summary:
      'Giữa cuộc chiến mưu sinh khốc liệt nơi đô thị hào nhoáng, một gia đình trong một xóm nghèo đứng trước nguy cơ mất chốn nương thân.',
    director: 'Mr. Tô',
    actors: 'Thái Hòa, Lê Phương, NSƯT Kim Phương, Trịnh Thảo, NSND Thanh Nam',
    duration: parseDuration('40 phút/tập'),
    genres: 'Gia đình, Chính kịch',
    countries: 'Việt Nam',
    releaseDate: new Date('2025-10-28'),
    rating: 8.0,
    ageRating: 'T13',
    posterUrl: 'https://phim.nguonc.com/public/images/Post/6/cuoc-chien-ha-luu-1.jpg',
    backdropUrl: 'https://phim.nguonc.com/public/images/Post/6/cuoc-chien-ha-luu.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=iBTNDJli19k',
    formats: JSON.stringify(['2D']),
    cast: JSON.stringify([
      'Thái Hòa',
      'Lê Phương',
      'NSƯT Kim Phương',
      'Trịnh Thảo',
      'NSND Thanh Nam',
    ]),
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: true,
  },
  {
    id: 'movie-hai-duong-trong-gio',
    title: 'Hải Đường Trong Gió',
    slug: 'hai-duong-trong-gio',
    description:
      'Phim kể về hành trình nhiều sóng gió xoay quanh Hải Đường (Thúy Ngân) - cô gái có thanh xuân bất hạnh, không chỉ bị cha dượng là ông Dần (Trung Dũng) cưỡng bức mà còn bị hắn vu oan phải vào tù. Sau nhiều biến cố, Hải Đường vì muốn trả thù cha dượng của mình đã gia nhập thế giới ngầm, trở thành "chị đại" điều hành đường dây kinh doanh quán bar, vũ trường.',
    summary:
      'Hành trình trả thù và sa vào thế giới ngầm của Hải Đường sau nhiều biến cố.',
    director: 'Nguyễn Hoàng Anh',
    actors: 'Thúy Ngân, Trung Dũng, Lãnh Thanh, Ngân Quỳnh',
    duration: parseDuration('32 phút/tập'),
    genres: 'Tội phạm, Báo thù',
    countries: 'Việt Nam',
    releaseDate: new Date('2025-10-29'),
    rating: 8.8,
    ageRating: 'T16',
    posterUrl: 'https://phim.nguonc.com/public/images/Post/6/hai-duong-trong-gio.jpg',
    backdropUrl:
      'https://phim.nguonc.com/public/images/Post/6/hai-duong-trong-gio-1.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=3t3X4ecukUo',
    formats: JSON.stringify(['2D']),
    cast: JSON.stringify(['Thúy Ngân', 'Trung Dũng', 'Lãnh Thanh', 'Ngân Quỳnh']),
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: false,
  },
  {
    id: 'movie-mua-tren-canh-buom',
    title: 'Mưa trên cánh bướm',
    slug: 'mua-tren-canh-buom',
    description:
      'Một người phụ nữ trung niên vô tình phát hiện chồng mình ngoại tình qua một trận bóng trên truyền hình. Bà tìm đến thầy đồng để mong thay đổi chồng, nhưng vô tình đánh thức thế lực đen tối trong nhà mà chỉ bà và con gái nhìn thấy.',
    summary:
      'Bà Tâm phát hiện chồng ngoại tình, tìm thầy đồng và vô tình đánh thức thế lực đen tối.',
    director: 'Linh Duong',
    actors: 'Tú Oanh, Nguyễn Nam Linh, Lê Vũ Long',
    duration: parseDuration('97 phút'),
    genres: 'Tâm lý, Kinh dị',
    countries: 'Việt Nam',
    releaseDate: new Date('2025-09-15'),
    rating: 7.8,
    ageRating: 'T16',
    posterUrl:
      'https://phim.nguonc.com/public/images/Film/zPk3XdI5KhkqUSQEiKfGR1nMb2D.jpg',
    backdropUrl:
      'https://phim.nguonc.com/public/images/Film/m6eXzAXYYcdjmKdRWSL6YZDnlh2.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=90W8E41rrB8',
    formats: JSON.stringify(['2D']),
    cast: JSON.stringify(['Tú Oanh', 'Nguyễn Nam Linh', 'Lê Vũ Long']),
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: false,
  },
  {
    id: 'movie-lang-vu-dai-ngay-ay',
    title: 'Làng Vũ Đại ngày ấy',
    slug: 'lang-vu-dai-ngay-ay',
    description:
      'Phim chuyển thể từ các tác phẩm của Nam Cao (Sống Mòn, Chí Phèo, Lão Hạc), khắc họa cuộc sống nông thôn và xã hội thực dân nửa phong kiến trước Cách mạng Tháng Tám.',
    summary:
      'Bức tranh xã hội nông thôn Việt Nam trước 1945 qua góc nhìn Nam Cao.',
    director: 'Phạm Văn Khoa',
    actors: 'Hữu Mười, Bùi Cường, Đức Lưu',
    duration: parseDuration('90 phút'),
    genres: 'Chính kịch, Lịch sử',
    countries: 'Việt Nam',
    releaseDate: new Date('2025-09-06'),
    rating: 8.3,
    ageRating: 'T13',
    posterUrl: 'https://phim.nguonc.com/public/images/Film/3TiEcTIJvdf8AVUaC994MCnSHK0.jpg',
    backdropUrl:
      'https://phim.nguonc.com/public/images/Film/i9Ac0XqphY2deSxdWktOHaeRsUn.jpg',
    trailerUrl: null, // không có trailer
    formats: JSON.stringify(['2D']),
    cast: JSON.stringify(['Hữu Mười', 'Bùi Cường', 'Đức Lưu']),
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: false,
  },
  {
    id: 'movie-tham-tu-kien-ky-an-khong-dau',
    title: 'Thám Tử Kiên: Kỳ Án Không Đầu',
    slug: 'tham-tu-kien-ky-an-khong-dau',
    description:
      'Một ngôi làng hẻo lánh xảy ra chuỗi án mạng rùng rợn: tám nạn nhân đều không còn đầu. Thám Tử Kiên phải lần ra hung thủ trước khi có người tiếp theo.',
    summary:
      'Chuỗi án mạng “không đầu” gây chấn động một ngôi làng hẻo lánh.',
    director: 'Victor Vũ',
    actors: 'Quốc Huy, Ngọc Diệp, Minh Anh',
    duration: parseDuration('131 phút'),
    genres: 'Kinh dị, Thám tử',
    countries: 'Việt Nam',
    releaseDate: new Date('2025-10-10'),
    rating: 8.7,
    ageRating: 'T16',
    posterUrl: 'https://phim.nguonc.com/public/images/Film/rmhmfqVVUWV4xjoC0uBnelARFmT.jpg',
    backdropUrl:
      'https://phim.nguonc.com/public/images/Film/zHMrhNFgmvLE3rYBQYwFXuUBQMX.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=v-glrj_g1tc',
    formats: JSON.stringify(['2D', '3D']),
    cast: JSON.stringify(['Quốc Huy', 'Ngọc Diệp', 'Minh Anh']),
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: true,
  },
  {
    id: 'movie-bo-tu-bao-thu',
    title: 'Bộ Tứ Báo Thủ',
    slug: 'bo-tu-bao-thu',
    description:
      'Bộ tứ “báo thủ” Chét-Xi-Cà, Dì Bốn, Cậu Mười Một, Con Kiều tái xuất với phi vụ thế kỷ tại Đà Lạt.',
    summary:
      'Phi vụ “báo thủ” khuấy đảo mùa Tết.',
    director: 'Trấn Thành',
    actors: 'Quốc Anh, Trần Tiểu Vy, Kỳ Duyên',
    duration: parseDuration('133 phút'),
    genres: 'Hài, Hành động',
    countries: 'Việt Nam',
    releaseDate: new Date('2025-09-01'),
    rating: 8.0,
    ageRating: 'T13',
    posterUrl: 'https://phim.nguonc.com/public/images/Film/1c675BVbmNm1OoshmUWlL3wsgNt.jpg',
    backdropUrl:
      'https://phim.nguonc.com/public/images/Film/xfCtJdLp6lZiBZhrr9OCGhFWXyu.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=zKMOgOWn8lQ',
    formats: JSON.stringify(['2D', '3D']),
    cast: JSON.stringify(['Quốc Anh', 'Trần Tiểu Vy', 'Kỳ Duyên']),
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: false,
  },
  {
    id: 'movie-den-am-hon',
    title: 'Đèn Âm Hồn',
    slug: 'den-am-hon',
    description:
      'Cảm hứng từ “Người Con Gái Nam Xương”: Lĩnh nhặt được cây đèn âm hồn, nhiều chuyện ma quái ập đến.',
    summary:
      'Chiếc đèn bí ẩn và ác linh báo thù.',
    director: 'Hoàng Nam',
    actors: 'Chiều Xuân, Hạo Khang, Quang Teo',
    duration: parseDuration('101 phút'),
    genres: 'Kinh dị, Tâm linh',
    countries: 'Việt Nam',
    releaseDate: new Date('2025-08-11'),
    rating: 7.5,
    ageRating: 'T16',
    posterUrl: 'https://phim.nguonc.com/public/images/Post/7/den-am-hon-1.jpg',
    backdropUrl: 'https://phim.nguonc.com/public/images/Post/7/den-am-hon.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=pQtN0wQ_2YM',
    formats: JSON.stringify(['2D']),
    cast: JSON.stringify(['Chiều Xuân', 'Hạo Khang', 'Quang Teo']),
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: false,
  },
  {
    id: 'movie-nha-gia-tien',
    title: 'Nhà Gia Tiên',
    slug: 'nha-gia-tien',
    description:
      'Câu chuyện đa góc nhìn trong một gia đình. Mỹ Tiên trở về nhà gia tiên quay video “triệu view” và nhìn thấy người anh đã mất.',
    summary:
      'Ngôi nhà gia tiên, mạng xã hội và những điều bí ẩn.',
    director: 'Huỳnh Lập',
    actors: 'Huỳnh Lập, Phương Mỹ Chi, Ngô Phạm Hạnh Thúy',
    duration: parseDuration('117 phút'),
    genres: 'Hài, Tâm linh',
    countries: 'Việt Nam',
    releaseDate: new Date('2025-07-11'),
    rating: 8.1,
    ageRating: 'T13',
    posterUrl: 'https://phim.nguonc.com/public/images/Film/9I1vkFmEGqJiod3lbWFSj47HDo8.jpg',
    backdropUrl:
      'https://phim.nguonc.com/public/images/Film/yHdDgzEnFslwfwz2Hzc498lIhFx.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=wfPTz0A23ns',
    formats: JSON.stringify(['2D']),
    cast: JSON.stringify(['Huỳnh Lập', 'Phương Mỹ Chi', 'Ngô Phạm Hạnh Thúy']),
    status: 'NOW_PLAYING',
    isPreSale: false,
    isFeatured: false,
  },
];

const EVENTS = [
  {
    title: 'MUA HOẶC NẠP THẺ QUÀ TẶNG, TẶNG LƯỢT CHƠI GẤP THÚ',
    slug: 'mua-hoac-nap-the-qua-tang-tang-luot-choi-gap-thu',
    description:
      'Tặng lượt chơi gấp thú khi mua hoặc nạp Thẻ Quà Tặng CGV mới tại quầy. Thời gian: 01/10/2025 - 31/12/2025',
    content: `<h3>Thời gian: 01/10/2025 - 31/12/2025</h3>
<p>Tặng lượt chơi gấp thú khi mua hoặc nạp Thẻ Quà Tặng CGV mới tại quầy</p>
<ul>
  <li>Mua hoặc nạp Thẻ Quà Tặng CGV 200,000VND → tặng 02 lượt chơi gấp thú</li>
  <li>Mua hoặc nạp 400,000VND → tặng 04 lượt chơi gấp thú</li>
  <li>Mua hoặc nạp 600,000VND → tặng 06 lượt chơi gấp thú</li>
</ul>
<p><strong>* Phiếu lượt chơi chỉ có giá trị trong ngày giao dịch.</strong></p>`,
    imageUrl: 'https://www.cgv.vn/media/wysiwyg/2025/092025/350x496.jpg',
    thumbnailUrl: 'https://www.cgv.vn/media/wysiwyg/2025/092025/350x496.jpg',
    startDate: new Date('2025-10-01'),
    endDate: new Date('2025-12-31'),
    status: 'ACTIVE',
    isFeatured: true,
  },
  {
    title: 'Snack Đủ Vị - Xem Phim Hay Hết Ý',
    slug: 'snack-du-vi-xem-phim-hay-het-y',
    description:
      'Snack giòn tan Koikeya tại Galaxy – nhiều vị ngon, mua kèm combo giá ưu đãi.',
    content: `<p>Đồng giá 35.000đ/bịch; 25.000đ khi mua kèm Combo.</p>
<p><strong>Thời gian:</strong> từ 01.04.2025. <strong>Địa điểm:</strong> toàn hệ thống Galaxy Cinema.</p>`,
    imageUrl:
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2025-12-31'),
    status: 'ACTIVE',
    isFeatured: true,
  },
  {
    title:
      'ĐẶT VÉ PHIM TRÊN ZALOPAY ĐỂ HƯỞNG KHUYẾN MẠI ĐỒNG GIÁ VÉ CHỈ 104.000đ - 115.000đ',
    slug: 'dat-ve-phim-tren-zalopay-de-huong-khuyen-mai-dong-gia-ve-chi-104000d-115000d',
    description:
      'Đồng giá CGV chỉ 104K/vé & 115K/vé. Không giới hạn số lượng vé khi đặt qua ZaloPay.',
    content: `<ul>
  <li>Áp dụng suất 2D (Standard/VIP), không áp dụng IMAX/4DX,...</li>
  <li>Mỗi tài khoản ZaloPay nhận ưu đãi 01 lần trong suốt chương trình.</li>
</ul>`,
    imageUrl: 'https://www.cgv.vn/media/wysiwyg/2025/102025/350x495_6_.png',
    thumbnailUrl: 'https://www.cgv.vn/media/wysiwyg/2025/102025/350x495_6_.png',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    status: 'ACTIVE',
    isFeatured: false,
  },
  {
    title: 'IMAX Treasure Hunt - Thưởng thức IMAX Laser tại Galaxy Sala',
    slug: 'imax-treasure-hunt-thuong-thuc-imax-laser-tai-galaxy-sala',
    description:
      'Xem IMAX Laser tại Galaxy Sala, nhận quà Avatar: Fire And Ash đến 31.12.2025',
    content: `<p>Chinh phục 5 phim IMAX để nhận quà độc quyền Avatar.</p>`,
    imageUrl:
      'https://www.galaxycine.vn/media/2025/9/24/imax-treasure-hunt-5_1758703687529.jpg',
    thumbnailUrl:
      'https://www.galaxycine.vn/media/2025/9/24/imax-treasure-hunt-5_1758703687529.jpg',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    status: 'ACTIVE',
    isFeatured: true,
  },
];

const PAYMENT_GATEWAYS = [
  {
    code: 'mock',
    name: 'Mock Payment',
    enabled: true,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0,
    feeFixed: null,
    minFee: null,
    maxFee: null,
    vatOnFeePercent: 0,
    methodOverrides: null,
    rules: null,
    configJson: JSON.stringify({
      description: 'Mock payment gateway for development',
    }),
  },
  {
    code: 'momo',
    name: 'MoMo',
    enabled: false,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0.011,
    feeFixed: null,
    minFee: null,
    maxFee: null,
    vatOnFeePercent: 0.1,
    methodOverrides: null,
    rules: null,
    configJson: JSON.stringify({
      description: 'MoMo payment gateway',
      partnerCode: process.env.MOMO_PARTNER_CODE || '',
      accessKey: process.env.MOMO_ACCESS_KEY || '',
    }),
  },
  {
    code: 'vnpay',
    name: 'VNPay',
    enabled: false,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0.009,
    feeFixed: null,
    minFee: null,
    maxFee: null,
    vatOnFeePercent: 0.1,
    methodOverrides: null,
    rules: null,
    configJson: JSON.stringify({
      description: 'VNPay payment gateway',
      tmnCode: process.env.VNPAY_TMN_CODE || '',
    }),
  },

  // Demo thêm:
  {
    code: 'zalopay',
    name: 'Zalo Pay',
    enabled: true,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0.1,
    feeFixed: 0,
    minFee: 1,
    maxFee: 500000,
    vatOnFeePercent: 0,
    methodOverrides: JSON.stringify({
      QR: { feePercent: 0.009 },
    }),
    rules: JSON.stringify({
      tiers: [
        { maxAmount: 2_000_000, feePercent: 0.01 },
        { maxAmount: null, feePercent: 0.009 },
      ],
    }),
    configJson: JSON.stringify({
      description: 'ZaloPay gateway (demo)',
      appId: process.env.ZALOPAY_APP_ID || '',
    }),
  },
  {
    code: 'shopeepay',
    name: 'ShopeePay',
    enabled: true,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0.012,
    feeFixed: 0,
    minFee: null,
    maxFee: null,
    vatOnFeePercent: 0.1,
    methodOverrides: JSON.stringify({
      QR: { feePercent: 0.0105 },
    }),
    rules: null,
    configJson: JSON.stringify({
      description: 'ShopeePay gateway (demo)',
    }),
  },
  {
    code: 'stripe',
    name: 'Stripe',
    enabled: false,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0.029,
    feeFixed: 5000,
    minFee: null,
    maxFee: null,
    vatOnFeePercent: 0,
    methodOverrides: null,
    rules: null,
    configJson: JSON.stringify({
      description: 'Stripe (international) demo',
      publishableKey: process.env.STRIPE_PK || '',
    }),
  },
  {
    code: 'paypal',
    name: 'PayPal',
    enabled: false,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0.0349,
    feeFixed: 4000,
    minFee: null,
    maxFee: null,
    vatOnFeePercent: 0,
    methodOverrides: null,
    rules: null,
    configJson: JSON.stringify({
      description: 'PayPal (international) demo',
      clientId: process.env.PAYPAL_CLIENT_ID || '',
    }),
  },
  {
    code: 'onepay',
    name: 'OnePay',
    enabled: false,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0.018,
    feeFixed: null,
    minFee: null,
    maxFee: null,
    vatOnFeePercent: 0.1,
    methodOverrides: JSON.stringify({
      Credit: { feePercent: 0.02 },
    }),
    rules: null,
    configJson: JSON.stringify({
      description: 'OnePay (demo)',
    }),
  },
  {
    code: 'payoo',
    name: 'Payoo',
    enabled: true,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0,
    feeFixed: 2000,
    minFee: null,
    maxFee: null,
    vatOnFeePercent: 0,
    methodOverrides: null,
    rules: null,
    configJson: JSON.stringify({
      description: 'Payoo fixed-fee demo',
    }),
  },
  {
    code: 'napasqr',
    name: 'NapasQR',
    enabled: true,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0.007,
    feeFixed: 0,
    minFee: null,
    maxFee: 22000,
    vatOnFeePercent: 0.1,
    methodOverrides: JSON.stringify({
      QR: { feePercent: 0.0065 },
    }),
    rules: null,
    configJson: JSON.stringify({
      description: 'Napas QR gateway (demo)',
    }),
  },
  {
    code: 'smartpay',
    name: 'SmartPay',
    enabled: true,
    locked: false,
    lockedReason: null,
    feeType: 'PERCENT',
    feePercent: 0.0085,
    feeFixed: 0,
    minFee: null,
    maxFee: null,
    vatOnFeePercent: 0.1,
    methodOverrides: null,
    rules: null,
    configJson: JSON.stringify({
      description: 'SmartPay POS/QR (demo)',
    }),
  },
];

/* =========================
   Seed steps
========================= */

async function resetData() {
  console.log('🗑️  Deleting existing data (order-safe)...');
  await prisma.ticket.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.seatStatus.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.screening.deleteMany({});
  await prisma.movie.deleteMany({});
  await prisma.cinema.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.paymentGateway.deleteMany({});
  console.log('✅ Cleared data');
}

async function seedUsers() {
  console.log('👤 Seeding users...');
  const adminEmail = 'admin@vticinema.com';
  const userEmail = 'user@example.com';

  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: adminHash, role: 'ADMIN', status: 'ACTIVE', name: 'Admin', phone: '0900000000' },
    create: {
      name: 'Admin',
      email: adminEmail,
      phone: '0900000000',
      password: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { email: userEmail },
    update: { password: userHash, role: 'USER', status: 'ACTIVE', name: 'Test User', phone: '0900000001' },
    create: {
      name: 'Test User',
      email: userEmail,
      phone: '0900000001',
      password: userHash,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Users ready');
}

async function seedCinemas() {
  console.log('🏢 Seeding cinemas...');
  for (const c of CINEMAS) {
    await prisma.cinema.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  console.log(`✅ Cinemas ready (${CINEMAS.length})`);
}

async function seedMovies() {
  console.log('🎬 Seeding movies...');
  const all = [...MOVIES_WITHOUT_TRAILER, ...MOVIES_WITH_TRAILER];

  for (const m of all) {
    const data = {
      ...m,
      // đảm bảo có genres/ageRating fallback nếu model yêu cầu
      genres: m.genres || parseGenres(m.description),
      ageRating: m.ageRating || parseAgeRating(m.description),
      slug: m.slug || slugify(m.title),
    };

    await prisma.movie.upsert({
      where: { id: m.id },
      update: data,
      create: data,
    });
    console.log(`  ✓ ${m.title}`);
  }
  console.log(`✅ Movies ready (${all.length})`);
}

async function seedScreeningsAndSeats() {
  console.log('🎟️  Seeding screenings & seats...');
  const screeningTimes = [8, 10, 16, 19, 22];
  const ROWS = 8;
  const COLS = 10;

  const cinemas = await prisma.cinema.findMany({ orderBy: { id: 'asc' } });
  const movies = await prisma.movie.findMany({ orderBy: { id: 'asc' } });

  // Get default STANDARD seat type
  const standardSeatType = await prisma.seatType.findUnique({
    where: { code: 'STANDARD' },
  });
  
  if (!standardSeatType) {
    throw new Error('STANDARD seat type not found. Please run seedSeatTypes.js first.');
  }

  // Create rooms for each cinema (5 rooms per cinema) + seats
  const roomMap = new Map(); // cinemaId -> rooms array
  for (const cinema of cinemas) {
    const rooms = [];
    for (let roomNum = 1; roomNum <= 5; roomNum++) {
      const room = await prisma.room.create({
        data: {
          cinemaId: cinema.id,
          name: `Phòng ${roomNum}`,
          rows: ROWS,
          cols: COLS,
        },
      });
      
      // Create seats for this room (once per room)
      const seatCreates = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const rowLetter = String.fromCharCode(65 + r); // A, B, C...
          const row = rowLetter; // String format
          const col = c + 1;
          const code = rowLetter + col; // A1..H10

          seatCreates.push(
            prisma.seat.create({
              data: {
                roomId: room.id,
                seatTypeId: standardSeatType.id,
                row,
                col,
                code,
                status: 'available',
              },
            })
          );
        }
      }
      
      // Create seats in batches
      const CONCURRENCY = 20;
      for (let k = 0; k < seatCreates.length; k += CONCURRENCY) {
        await Promise.all(seatCreates.slice(k, k + CONCURRENCY));
      }
      
      rooms.push(room);
    }
    roomMap.set(cinema.id, rooms);
  }

  const today = new Date();

  for (const movie of movies) {
    // tạo 5 suất chiếu cho mỗi phim, xoay vòng rạp
    for (let i = 0; i < 5; i++) {
      const cinema = cinemas[i % cinemas.length];
      const cinemaRooms = roomMap.get(cinema.id);
      const room = cinemaRooms[i % cinemaRooms.length];
      
      const startTime = addDaysAtHour(today, i + 1, screeningTimes[i]);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + (movie.duration || 120));

      const screening = await prisma.screening.create({
        data: {
          movieId: movie.id,
          cinemaId: cinema.id,
          room: room.name, // Keep for backward compatibility
          roomId: room.id, // NEW: Link to Room
          startTime,
          endTime,
          price: 80000 + Math.floor(Math.random() * 20000),
          basePrice: 80000 + Math.floor(Math.random() * 20000), // NEW
        },
      });

      // Create SeatStatus for all seats in this room for this screening
      // Seats already exist in Room, we just need to create SeatStatus records
      const roomSeats = await prisma.seat.findMany({
        where: { roomId: room.id },
      });

      const seatStatusCreates = [];
      for (const seat of roomSeats) {
        seatStatusCreates.push(
          prisma.seatStatus.create({
            data: {
              seatId: seat.id,
              screeningId: screening.id,
              status: 'AVAILABLE',
            },
          })
        );
      }

      // Create seat statuses in batches
      const CONCURRENCY = 20;
      for (let k = 0; k < seatStatusCreates.length; k += CONCURRENCY) {
        await Promise.all(seatStatusCreates.slice(k, k + CONCURRENCY));
      }

      console.log(
        `  ✓ Screening ${i + 1}/5 for "${movie.title}" at ${startTime.toLocaleString('vi-VN')} (${cinema.name})`
      );
    }
  }

  console.log('✅ Screenings & seats ready');
  return { rows: ROWS, cols: COLS, countMovies: movies.length, countCinemas: cinemas.length };
}

async function seedEvents() {
  console.log('🎉 Seeding events...');
  for (const e of EVENTS) {
    const data = { ...e, slug: e.slug || slugify(e.title) };
    await prisma.event.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    });
    console.log(`  ✓ ${e.title}`);
  }
  console.log(`✅ Events ready (${EVENTS.length})`);
}

async function seedPaymentGateways() {
  console.log('💳 Seeding payment gateways...');
  for (const g of PAYMENT_GATEWAYS) {
    await prisma.paymentGateway.upsert({
      where: { code: g.code },
      update: g,
      create: g,
    });
    console.log(`  ✓ ${g.code}`);
  }
  console.log(`✅ Payment gateways ready (${PAYMENT_GATEWAYS.length})`);
}

/* =========================
   Main
========================= */

async function main() {
  console.log('🌱 Starting full seed...');
  await resetData();

  await seedUsers();
  await seedCinemas();
  await seedMovies();
  const summarySeats = await seedScreeningsAndSeats();
  await seedEvents();
  await seedPaymentGateways();

  const totalScreenings = summarySeats.countMovies * 5;
  const seatsPerScreening = summarySeats.rows * summarySeats.cols;

  console.log('\n✨ Seeding completed!');
  console.log('\n=== Summary ===');
  console.log(`📽️  Movies: ${MOVIES_WITHOUT_TRAILER.length + MOVIES_WITH_TRAILER.length}`);
  console.log(`🎬 Cinemas: ${CINEMAS.length}`);
  console.log(`🎫 Screenings: ${totalScreenings}`);
  console.log(`💺 Seats per screening: ${seatsPerScreening}`);
  console.log(`🎉 Events: ${EVENTS.length}`);
  console.log('\n=== Login Credentials ===');
  console.log('Admin:');
  console.log('  Email: admin@vticinema.com');
  console.log('  Password: admin123');
  console.log('\nUser:');
  console.log('  Email: user@example.com');
  console.log('  Password: user123');
  console.log('========================\n');
}

// Run
main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
