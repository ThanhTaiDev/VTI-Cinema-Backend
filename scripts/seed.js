const bcrypt = require('bcrypt');
const prisma = require('../src/prismaClient');

// Helper function to parse duration from "50 phút/tập" or "105 phút"
const parseDuration = (timeStr) => {
  if (!timeStr) return 120;
  const match = timeStr.match(/(\d+)\s*phút/);
  return match ? parseInt(match[1]) : 120;
};

// Helper function to parse genres from description or use default
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

// Helper function to parse age rating from description or use default
const parseAgeRating = (description) => {
  if (!description) return 'T13';
  const desc = description.toLowerCase();
  if (desc.includes('cưỡng bức') || desc.includes('giết người') || desc.includes('kinh hoàng')) return 'T16';
  if (desc.includes('ma quái') || desc.includes('tâm linh')) return 'T16';
  return 'T13';
};

async function main() {
  console.log('🌱 Seeding database...');

  // Delete all existing data (except users)
  console.log('🗑️  Deleting existing data...');
  await prisma.ticket.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.seatStatus.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.screening.deleteMany({});
  await prisma.movie.deleteMany({});
  await prisma.cinema.deleteMany({});
  await prisma.event.deleteMany({});
  console.log('✅ Existing data deleted');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vticinema.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@vticinema.com',
      phone: '0900000000',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Admin user created:', admin.email);
  console.log('📧 Email: admin@vticinema.com');
  console.log('🔑 Password: admin123');

  // Create test user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Test User',
      email: 'user@example.com',
      phone: '0900000001',
      password: userPassword,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Test user created:', user.email);
  console.log('📧 Email: user@example.com');
  console.log('🔑 Password: user123');

  // Create 5 cinemas
  const cinema1 = await prisma.cinema.create({
    data: {
      id: 'cinema-1',
      name: 'CGV Aeon Long Biên',
      region: 'Hà Nội',
      address: 'Aeon Mall Long Biên, Hà Nội',
      latitude: 21.0285,
      longitude: 105.8542,
      logoUrl: 'https://example.com/cgv-logo.png',
      phone: '1900-6017',
    },
  });

  const cinema2 = await prisma.cinema.create({
    data: {
      id: 'cinema-2',
      name: 'CGV Aeon Bình Tân',
      region: 'Hồ Chí Minh',
      address: 'Aeon Mall Bình Tân, TP.HCM',
      latitude: 10.7769,
      longitude: 106.7009,
      logoUrl: 'https://example.com/cgv-logo.png',
      phone: '1900-6017',
    },
  });

  const cinema3 = await prisma.cinema.create({
    data: {
      id: 'cinema-3',
      name: 'CGV Vincom Center Landmark 81',
      region: 'Hồ Chí Minh',
      address: 'Vinhomes Central Park, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM',
      latitude: 10.7944,
      longitude: 106.7219,
      logoUrl: 'https://example.com/cgv-logo.png',
      phone: '1900-6017',
    },
  });

  const cinema4 = await prisma.cinema.create({
    data: {
      id: 'cinema-4',
      name: 'CGV Vincom Royal City',
      region: 'Hà Nội',
      address: '72A Nguyễn Trãi, Thanh Xuân, Hà Nội',
      latitude: 21.0014,
      longitude: 105.8164,
      logoUrl: 'https://example.com/cgv-logo.png',
      phone: '1900-6017',
    },
  });

  const cinema5 = await prisma.cinema.create({
    data: {
      id: 'cinema-5',
      name: 'CGV Crescent Mall',
      region: 'Hồ Chí Minh',
      address: '101 Tôn Dật Tiên, Tân Phú, Quận 7, TP.HCM',
      latitude: 10.7297,
      longitude: 106.7158,
      logoUrl: 'https://example.com/cgv-logo.png',
      phone: '1900-6017',
    },
  });

  console.log('✅ 5 cinemas created');

  const cinemas = [cinema1, cinema2, cinema3, cinema4, cinema5];

  // Movies without trailerUrl (create first)
  const moviesWithoutTrailer = [
    {
      id: 'movie-detective-conan',
      title: 'Detective Conan Movie 23: The Fist of Blue Sapphire',
      slug: 'detective-conan-movie-23-the-fist-of-blue-sapphire',
      description: 'Viên sapphire xanh vĩ đại nhất thế giới, "blue lapis fist", được cho là đã bị chìm trong một con tàu cướp biển vào cuối thế kỷ 19, trên bờ biển Singapore. Một triệu phú địa phương âm mưu lấy lại nó, và khi nó được trưng bày trong một cuộc triển lãm tại khách sạn Marina Sands ở Singapore, một vụ giết người đã xảy ra.',
      summary: 'Viên sapphire xanh vĩ đại nhất thế giới được cho là đã bị chìm trong một con tàu cướp biển vào cuối thế kỷ 19, trên bờ biển Singapore.',
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
      description: 'Bến không chồng là bộ phim tình cảm Việt Nam được chuyển thể từ tiểu thuyết cùng tên của nhà văn Dương Hướng. Bộ phim là câu chuyện về làng Đông – một làng quê được đặc tả với những nét văn hóa điển hình Bắc Bộ.',
      summary: 'Bến không chồng là bộ phim tình cảm Việt Nam được chuyển thể từ tiểu thuyết cùng tên của nhà văn Dương Hướng.',
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

  // Movies with trailerUrl (create last)
  const moviesWithTrailer = [
    {
      id: 'movie-co-dung-hong-thoat-khoi-toi',
      title: 'Cô Đừng Hòng Thoát Khỏi Tôi',
      slug: 'co-dung-hong-thoat-khoi-toi',
      description: 'Bộ phim khai thác chủ đề buôn người, lừa đảo trực tuyến và điều tra tội phạm xuyên biên giới. Không chỉ khắc họa cuộc đối đầu căng thẳng giữa lực lượng cảnh sát ngầm và đường dây tội phạm tinh vi, phim còn đan xen nhiều mối quan hệ phức tạp giữa yêu – hận – thù – lý tưởng.',
      summary: 'Bộ phim khai thác chủ đề buôn người, lừa đảo trực tuyến và điều tra tội phạm xuyên biên giới.',
      director: 'Nguyễn Hoàng Anh',
      actors: 'Lê Hải, Lê Phương, Thúy Ngân, Võ Cảnh',
      duration: parseDuration('50 phút/tập'),
      genres: 'Tội phạm, Điều tra',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-11-03'),
      rating: 8.5,
      ageRating: 'T16',
      posterUrl: 'https://phim.nguonc.com/public/images/Post/10/co-dung-hong-thoat-khoi-toi.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Post/10/co-dung-hong-thoat-khoi-toi-1.jpg',
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
      description: 'Giữa cuộc chiến mưu sinh khốc liệt nơi đô thị hào nhoáng, một gia đình gồm già trẻ lớn bé trong một xóm nghèo bỗng đứng trước nguy cơ mất đi chốn nương thân duy nhất. Khi biến cố ập đến, quá khứ, bí mật và toan tính riêng của mỗi người dần lộ diện. Liệu họ sẽ cùng nhau vượt qua hay chính những ẩn khuất ấy sẽ xé nát mái ấm mong manh này?',
      summary: 'Giữa cuộc chiến mưu sinh khốc liệt nơi đô thị hào nhoáng, một gia đình gồm già trẻ lớn bé trong một xóm nghèo bỗng đứng trước nguy cơ mất đi chốn nương thân duy nhất.',
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
      cast: JSON.stringify(['Thái Hòa', 'Lê Phương', 'NSƯT Kim Phương', 'Trịnh Thảo', 'NSND Thanh Nam']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: true,
    },
    {
      id: 'movie-hai-duong-trong-gio',
      title: 'Hải Đường Trong Gió',
      slug: 'hai-duong-trong-gio',
      description: 'Phim kể về hành trình nhiều sóng gió xoay quanh Hải Đường (Thúy Ngân) - cô gái có thanh xuân bất hạnh, không chỉ bị cha dượng là ông Dần (Trung Dũng) cưỡng bức mà còn bị hắn vu oan phải vào tù. Sau nhiều biến cố, Hải Đường vì muốn trả thù cha dượng của mình đã gia nhập thế giới ngầm, trở thành "chị đại" điều hành đường dây kinh doanh quán bar, vũ trường.',
      summary: 'Phim kể về hành trình nhiều sóng gió xoay quanh Hải Đường - cô gái có thanh xuân bất hạnh, trở thành "chị đại" điều hành đường dây kinh doanh quán bar, vũ trường.',
      director: 'Nguyễn Hoàng Anh',
      actors: 'Thúy Ngân, Trung Dũng, Lãnh Thanh, Ngân Quỳnh',
      duration: parseDuration('32 phút/tập'),
      genres: 'Tội phạm, Báo thù',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-10-29'),
      rating: 8.8,
      ageRating: 'T16',
      posterUrl: 'https://phim.nguonc.com/public/images/Post/6/hai-duong-trong-gio.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Post/6/hai-duong-trong-gio-1.jpg',
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
      description: 'Một người phụ nữ trung niên vô tình phát hiện chồng mình ngoại tình thông qua một trận bóng đá được phát trên sóng truyền hình. Bà quyết định tìm đến một thầy đồng mạng với niềm tin có thể thay đổi được chồng. Thế nhưng, những nghi thức bí ẩn lại vô tình đánh thức một thế lực đen tối trong nhà mà chỉ mình bà Tâm và con gái có thể nhìn thấy.',
      summary: 'Một người phụ nữ trung niên vô tình phát hiện chồng mình ngoại tình, quyết định tìm đến một thầy đồng mạng với niềm tin có thể thay đổi được chồng.',
      director: 'Linh Duong',
      actors: 'Tú Oanh, Nguyễn Nam Linh, Lê Vũ Long',
      duration: parseDuration('97 phút'),
      genres: 'Tâm lý, Kinh dị',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-09-15'),
      rating: 7.8,
      ageRating: 'T16',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/zPk3XdI5KhkqUSQEiKfGR1nMb2D.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/m6eXzAXYYcdjmKdRWSL6YZDnlh2.jpg',
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
      description: 'Phim Làng Vũ Đại ngày ấy dù là một tác phẩm điện ảnh chuyển thể từ các tác phẩm văn học vốn đã nổi tiếng trước đó của nhà văn Nam Cao (gồm Sống Mòn, Chí Phèo và Lão Hạc). Phim khắc họa cuộc sống nông thôn cũng như nhiều tầng lớp khác nhau trong xã hội thực dân nửa phong kiến của Việt Nam trước Cách mạng Tháng tám (1945).',
      summary: 'Phim chuyển thể từ các tác phẩm văn học của nhà văn Nam Cao, khắc họa cuộc sống nông thôn và nhiều tầng lớp khác nhau trong xã hội thực dân nửa phong kiến của Việt Nam.',
      director: 'Phạm Văn Khoa',
      actors: 'Hữu Mười, Bùi Cường, Đức Lưu',
      duration: parseDuration('90 phút'),
      genres: 'Chính kịch, Lịch sử',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-09-06'),
      rating: 8.3,
      ageRating: 'T13',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/3TiEcTIJvdf8AVUaC994MCnSHK0.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/i9Ac0XqphY2deSxdWktOHaeRsUn.jpg',
      trailerUrl: null, // No trailer provided
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
      description: 'Một chuỗi án mạng kinh hoàng tại một ngôi làng hẻo lánh – nơi liên tiếp xảy ra tám vụ giết người với cùng một đặc điểm rợn người: tất cả nạn nhân đều không còn đầu. Thám Tử Kiên phải đối mặt với vụ án khủng khiếp gây hoang mang tột độ cho dân làng. Ai sẽ là nạn nhân tiếp theo trong chuỗi án mạng rùng rợn? Kiên có tìm ra mấu chốt để lần theo dấu vết hung thủ?',
      summary: 'Một chuỗi án mạng kinh hoàng tại một ngôi làng hẻo lánh – nơi liên tiếp xảy ra tám vụ giết người với cùng một đặc điểm rợn người: tất cả nạn nhân đều không còn đầu.',
      director: 'Victor Vũ',
      actors: 'Quốc Huy, Ngọc Diệp, Minh Anh',
      duration: parseDuration('131 phút'),
      genres: 'Kinh dị, Thám tử',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-10-10'),
      rating: 8.7,
      ageRating: 'T16',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/rmhmfqVVUWV4xjoC0uBnelARFmT.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/zHMrhNFgmvLE3rYBQYwFXuUBQMX.jpg',
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
      description: 'Bộ tứ báo thủ bao gồm Chét-Xi-Cà, Dì Bốn, Cậu Mười Một, Con Kiều chính thức xuất hiện cùng với phi vụ báo thế kỉ. Nghe nói kế hoạch tiếp theo là ở Đà Lạt, liệu bốn báo thủ sẽ quậy Tết tung nóc cỡ nào?',
      summary: 'Bộ tứ báo thủ bao gồm Chét-Xi-Cà, Dì Bốn, Cậu Mười Một, Con Kiều chính thức xuất hiện cùng với phi vụ báo thế kỉ.',
      director: 'Trấn Thành',
      actors: 'Quốc Anh, Trần Tiểu Vy, Kỳ Duyên',
      duration: parseDuration('133 phút'),
      genres: 'Hài, Hành động',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-09-01'),
      rating: 8.0,
      ageRating: 'T13',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/1c675BVbmNm1OoshmUWlL3wsgNt.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/xfCtJdLp6lZiBZhrr9OCGhFWXyu.jpg',
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
      description: 'Lấy cảm hứng từ Chuyện Người Con Gái Nam Xương, Thương một mình nuôi con chờ chồng đi lính trở về. Lĩnh - con trai cô nhặt được một cây đèn, từ đó cậu gọi chiếc bóng trên tường là cha. Nào ngờ đó là đèn âm hồn, có thể đã gọi ác linh về báo thù, gây ra nhiều chuyện ma quái. Liệu chiếc bóng đó có phải chồng của Thương không?',
      summary: 'Lấy cảm hứng từ Chuyện Người Con Gái Nam Xương, Thương một mình nuôi con chờ chồng đi lính trở về. Lĩnh nhặt được một cây đèn âm hồn, gây ra nhiều chuyện ma quái.',
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
      description: 'Nhà Gia Tiên xoay quanh câu chuyện đa góc nhìn về các thế hệ khác nhau trong một gia đình, có hai nhân vật chính là Gia Minh (Huỳnh Lập) và Mỹ Tiên (Phương Mỹ Chi). Trở về căn nhà gia tiên để quay các video "triệu view" trên mạng xã hội, Mỹ Tiên - một nhà sáng tạo nội dung thuộc thế hệ Z vốn không tin vào chuyện tâm linh, hoàn toàn mất kết nối với gia đình, bất ngờ nhìn thấy Gia Minh - người anh trai đã mất từ lâu.',
      summary: 'Nhà Gia Tiên xoay quanh câu chuyện đa góc nhìn về các thế hệ khác nhau trong một gia đình, có hai nhân vật chính là Gia Minh và Mỹ Tiên.',
      director: 'Huỳnh Lập',
      actors: 'Huỳnh Lập, Phương Mỹ Chi, Ngô Phạm Hạnh Thúy',
      duration: parseDuration('117 phút'),
      genres: 'Hài, Tâm linh',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-07-11'),
      rating: 8.1,
      ageRating: 'T13',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/9I1vkFmEGqJiod3lbWFSj47HDo8.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/yHdDgzEnFslwfwz2Hzc498lIhFx.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=wfPTz0A23ns',
      formats: JSON.stringify(['2D']),
      cast: JSON.stringify(['Huỳnh Lập', 'Phương Mỹ Chi', 'Ngô Phạm Hạnh Thúy']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: false,
    },
  ];

  // Create movies without trailer first
  console.log('🎬 Creating movies without trailer...');
  for (const movieData of moviesWithoutTrailer) {
    const movie = await prisma.movie.create({ data: movieData });
    console.log(`✅ Created movie: ${movie.title}`);
  }

  // Create movies with trailer last
  console.log('🎬 Creating movies with trailer...');
  for (const movieData of moviesWithTrailer) {
    const movie = await prisma.movie.create({ data: movieData });
    console.log(`✅ Created movie: ${movie.title}`);
  }

  console.log('✅ All movies created');

  // Create screenings for each movie
  // Each movie gets 5 screenings with times: 8h, 10h, 16h, 19h, 22h
  const screeningTimes = [8, 10, 16, 19, 22]; // 8h, 10h, 16h, 19h, 22h
  const allMovies = [...moviesWithoutTrailer, ...moviesWithTrailer];
  const ROWS = 8;
  const COLS = 10;

  console.log('🎫 Creating screenings and seats...');
  for (const movieData of allMovies) {
    const movie = await prisma.movie.findUnique({ where: { id: movieData.id } });
    
    // Get random dates (today + 1 to 7 days)
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 7) + 1);
      dates.push(date);
    }

    // Create 5 screenings for this movie
    for (let i = 0; i < 5; i++) {
      const randomCinema = cinemas[Math.floor(Math.random() * cinemas.length)];
      const screeningDate = new Date(dates[i]);
      screeningDate.setHours(screeningTimes[i], 0, 0, 0);
      
      const endTime = new Date(screeningDate);
      endTime.setMinutes(endTime.getMinutes() + movie.duration);

      const screening = await prisma.screening.create({
        data: {
          movieId: movie.id,
          cinemaId: randomCinema.id,
          room: `Phòng ${Math.floor(Math.random() * 5) + 1}`,
          startTime: screeningDate,
          endTime: endTime,
          price: 80000 + Math.floor(Math.random() * 20000), // 80k - 100k
        },
      });

      // Create seats for this screening
      const seatTasks = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const row = r + 1;
          const col = c + 1;
          const code = String.fromCharCode(65 + r) + col; // A1, A2, ..., H10

          seatTasks.push(
            prisma.seat.create({
              data: {
                screeningId: screening.id,
                row,
                col,
                code,
                statuses: {
                  create: {
                    screeningId: screening.id,
                    status: 'AVAILABLE',
                  },
                },
              },
            })
          );
        }
      }
      await Promise.all(seatTasks);
      console.log(`✅ Created screening ${i + 1}/5 for ${movie.title} at ${screeningDate.toLocaleString('vi-VN')} in ${randomCinema.name}`);
    }
  }

  // Helper function to generate slug from title
  const generateSlug = (title) => {
    return title.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Create 4 sample events
  console.log('🎉 Creating events...');
  const events = [
    {
      title: 'MUA HOẶC NẠP THẺ QUÀ TẶNG, TẶNG LƯỢT CHƠI GẤP THÚ',
      slug: 'mua-hoac-nap-the-qua-tang-tang-luot-choi-gap-thu',
      description: 'Tặng lượt chơi gấp thú khi mua hoặc nạp Thẻ Quà Tặng CGV mới tại quầy. Thời gian: 01/10/2025 - 31/12/2025',
      content: `<h3>Thời gian: 01/10/2025 - 31/12/2025</h3>
<p>Tặng lượt chơi gấp thú khi mua hoặc nạp Thẻ Quà Tặng CGV mới tại quầy</p>
<ul>
  <li>Mua hoặc nạp Thẻ Quà Tặng CGV giá trị 200,000VND/ thẻ → Sẽ được tặng 02 lượt chơi gấp thú bông miễn phí</li>
  <li>Mua hoặc nạp Thẻ Quà Tặng CGV giá trị 400,000VND/ thẻ → Sẽ được tặng 04 lượt chơi gấp thú bông miễn phí</li>
  <li>Mua hoặc nạp Thẻ Quà Tặng CGV giá trị 600,000VND/ thẻ → Sẽ được tặng 06 lượt chơi gấp thú bông miễn phí</li>
</ul>
<h4>Cơ hội gấp trúng các quà tặng hấp dẫn độc quyền của CGV gồm:</h4>
<ul>
  <li>Gấu bông CGV</li>
  <li>Thẻ quà tặng 50,000 VND</li>
  <li>Vé xem phim 2D</li>
  <li>Coupon My Combo</li>
  <li>Coupon CGV Combo</li>
</ul>
<h4>Áp dụng tại các rạp CGV sau:</h4>
<ul>
  <li>CGV Aeon Bình Tân</li>
  <li>CGV Aeon Mall Tân Phú</li>
  <li>CGV Sư Vạn Hạnh</li>
  <li>CGV Vincom Landmark</li>
  <li>CGV Vincom Thủ Đức</li>
  <li>CGV Giga Mall Thủ Đức</li>
  <li>CGV Vincom Royal City</li>
  <li>CGV Vincom Times City</li>
  <li>CGV Aeon Hà Đông</li>
  <li>CGV Aeon Mall Canary</li>
  <li>CGV Bình Dương Square</li>
</ul>
<p><strong>* Phiếu lượt chơi Máy Gấp Thú CGV được in kèm với hóa đơn khi hoàn tất giao dịch mua Thẻ Quà Tặng hoặc nạp tiền.</strong></p>
<p><strong>* Phiếu lượt chơi Máy Gấp Thú CGV chỉ có giá trị trong ngày giao dịch.</strong></p>
<p><strong>* Quét mã trò chơi tại Máy Gấp Thú CGV và chơi để nhận quà.</strong></p>`,
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
      description: 'Bạn là tín đồ yêu điện ảnh, bạn cũng đam mê các món snack giòn tan, đậm đà và thật tuyệt vời khi nhâm nhi snack trong lúc thường thức những thước phim.',
      content: `<p>Bạn là tín đồ yêu điện ảnh, bạn cũng đam mê các món snack giòn tan, đậm đà và thật tuyệt vời khi nhâm nhi snack trong lúc thường thức những thước phim.</p>
<p>Hãy để Galaxy Cinema mang đến nhiều lựa chọn hơn cho bạn với các dòng snack đình đám đến từ Koikeya: Karamucho, Koimucho và Gokochi giúp từng khoảnh khắc xem phim của bạn thêm đậm đà, cuốn rũ đến phút cuối cùng.</p>
<p>Snack của Koikeya có nhiều hương vị khác nhau để các Stars thoải mái lựa chọn và thưởng thức trọn vị ngon đến từ Nhật Bản.</p>
<h4>Karamucho – Snack khoai tây giòn rụm, chuẩn vị cay dành cho team mê đậm đà.</h4>
<ul>
  <li>Vị cay đặc biệt bùng nổ vị giác với sự hòa quyện giữa chua, cay, mặn, ngọt và độ nồng của ớt.</li>
  <li>Vị sốt cay ngọt Hàn Quốc đậm vị với hương sốt Yangyeom cực bắt miệng.</li>
  <li>Vị rong biển cay kết hợp giữa rong biển thơm lừng và khoai tây giòn rụm khiến bạn cuốn hút đến lát cuối cùng.</li>
</ul>
<h4>Koimucho - Snack bắp giòn tan, ngọt dịu, cực kỳ dễ gây nghiện.</h4>
<ul>
  <li>Vị bơ tỏi thơm lừng, cuốn hút ngay từ miếng đầu tiên.</li>
  <li>Vị bơ mật ong thơm béo, ngọt dịu, tan chảy đầy mê hoặc.</li>
  <li>Vị sữa bắp với hương thơm tự nhiên và vị ngọt thanh của bắp, đây sẽ là lựa chọn lý tưởng đặc biệt dành cho các bạn nhỏ.</li>
</ul>
<h4>Gokochi - Snack khoai tây tự nhiên, không thêm bột ngọt với 3 vị đặc biệt.</h4>
<ul>
  <li>Vị muối tự nhiên kết hợp khoai tây tươi cùng vị ngọt thanh từ cá và tảo biển, tạo nên hương vị tinh tế đầy lôi cuốn.</li>
  <li>Vị muối tiêu đen với lát bánh dày giòn bùi, thấm đẫm hương tiêu ấm áp sẽ khiến bạn mê mẩn.</li>
  <li>Vị rong biển với vị ngọt tự nhiên từ rong biển và nấm vi sinh lên men sẽ là lựa chọn chuẩn healthy mà vẫn ngon khó cưỡng.</li>
</ul>
<p>Đến ngay Galaxy Cinema để trải nghiệm siêu phẩm Snack đủ vị - Xem phim hay hết ý tại rạp nha!</p>
<p><strong>Giá bán:</strong> Đồng giá 35.000vnđ/bịch lẻ, Chỉ 25.000vnđ/bịch khi mua kèm Combo Bắp Nước bất kỳ.</p>
<p><strong>Thời gian:</strong> áp dụng từ ngày 01.04.2025.</p>
<p><strong>Địa điểm:</strong> tất cả các cụm rạp Galaxy Cinema trên toàn quốc.</p>`,
      imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2025-12-31'),
      status: 'ACTIVE',
      isFeatured: true,
    },
    {
      title: 'ĐẶT VÉ PHIM TRÊN ZALOPAY ĐỂ HƯỞNG KHUYẾN MẠI ĐỒNG GIÁ VÉ CHỈ 104.000đ - 115.000đ',
      slug: 'dat-ve-phim-tren-zalopay-de-huong-khuyen-mai-dong-gia-ve-chi-104000d-115000d',
      description: 'Đồng giá CGV chỉ 104K/vé & 115K/vé. Không giới hạn số lượng vé khi đặt vé phim trên Zalopay.',
      content: `<h3>1. Địa điểm sử dụng: Đặt Vé Phim CGV trên Zalopay</h3>
<h3>2. Đối tượng khuyến mại: Tất cả khách hàng của Zalopay</h3>
<h3>3. Nội dung chương trình:</h3>
<ul>
  <li>Đồng giá CGV chỉ 104K/vé & 115K/vé</li>
  <li>Không giới hạn số lượng vé (xem thêm quy định về loại vé và phòng chiếu)</li>
</ul>
<h4>**Quy định về loại vé & phòng chiếu</h4>
<ul>
  <li>Áp dụng các suất chiếu 2D CGV (ghế Standard, ghế VIP).</li>
  <li>KHÔNG áp dụng cho các rạp CGV bán giá vé 2D tại rạp nhỏ hơn hoặc bằng 100.000đ</li>
  <li>KHÔNG áp dụng Thứ 4 vui vẻ và Thứ 2 Cultureday</li>
  <li>KHÔNG áp dụng cho các Suất chiếu sớm/ Suất chiếu đặc biệt/ Suất chiếu phim cũ/ Suất chiếu ngày Lễ Tết/ Suất chiếu 2D trong phòng chiếu đặc biệt HOẶC các phòng chiếu như: IMAX, 4DX, GOLD CLASS, STARIUM, L'AMOUR….</li>
  <li>KHÔNG áp dụng cho Starter</li>
</ul>
<h4>**Quy định về thanh toán:</h4>
<ul>
  <li>CT không áp dụng cho GD thanh toán qua VietQR, Apple Pay và các nguồn tiền thanh toán phi liên kết.</li>
  <li>Khi KH thay đổi nguồn tiền thanh toán, vui lòng áp dụng lại ưu đãi trước khi xác nhận lại thanh toán.</li>
  <li>Giao dịch lì xì, chuyển tiền trên Zalo, gửi quà mừng, chuyển tiền từ tài khoản Zalopay đến số thẻ/số tài khoản ngân hàng hoặc rút tiền về tài khoản thẻ/ngân hàng không tính là giao dịch thanh toán.</li>
  <li>Mỗi tài khoản Zalopay nhận được ưu đãi 01 lần trong suốt thời gian diễn ra chương trình.</li>
  <li>Chương trình không hỗ trợ hoàn tiền cho các giao dịch hủy vé.</li>
  <li>Không áp dụng thẻ ảo, thẻ prepaid và thẻ Napas.</li>
</ul>
<h4>**Quy định khác:</h4>
<ul>
  <li>Trường hợp bạn không đủ điều kiện tham gia chương trình do tài khoản Zalo không hoạt động thường xuyên hoặc nằm trong danh sách có hoạt động bất thường được ghi nhận tự động bởi hệ thống Zalopay.</li>
  <li>Chương trình có thể kết thúc trước thời hạn nếu hết ngân sách khuyến mãi hoặc tạm dừng nếu có dấu hiệu gian lận, đầu cơ.</li>
  <li>Giao dịch bị xác định là gian lận, giả mạo thì quà tặng khuyến mại sẽ bị hủy.</li>
  <li>Không áp dụng đồng thời với các chương trình khuyến mãi với phim khác của Lotte Cinema, BHDS, CGV, Galaxy Cinema và Zalopay.</li>
  <li>Chương trình này không hỗ trợ các giao dịch hủy, đổi trả đối với các đơn hàng đã thanh toán thành công.</li>
  <li>Trong trường hợp có tranh chấp, quyết định của Zalopay là quyết định cuối cùng.</li>
  <li>Ban tổ chức sẽ không giải quyết các trường hợp khách hàng khiếu nại về chương trình sau 3 ngày kể từ khi chương trình kết thúc.</li>
  <li>Căn cứ Luật Điện ảnh của Bộ trưởng Bộ Văn Hóa, Thể thao, Du lịch ngày 15/06/2022, Zalopay - Đặt Vé Phim thông báo áp dụng quy định về khung giờ chiếu phim cho trẻ em như sau:</li>
  <li>Trẻ em: Là khách hàng dưới 16 tuổi (căn cứ vào năm sinh của Khách Hàng) hoặc cao dưới 130cm (đối với một số trường hợp)</li>
  <li>Giờ chiếu phim cho trẻ em dưới 13 tuổi tại rạp kết thúc trước 22 giờ.</li>
  <li>Giờ chiếu phim cho trẻ em dưới 16 tuổi tại rạp kết thúc trước 23 giờ.</li>
</ul>
<p>Khi thanh toán, nếu khách hàng KHÔNG được giảm giá vui lòng gọi Hotline: 1900 54 54 36 để nhận hướng dẫn trước khi xác nhận thanh toán.</p>`,
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
      description: 'Thưởng thức IMAX Laser tại Galaxy Sala, nhận ngay bộ quà đặc biệt Avatar: Fire And Ash! Từ nay đến 31.12.2025',
      content: `<p>Thưởng thức IMAX Laser tại Galaxy Sala, nhận ngay bộ quà đặc biệt Avatar: Fire And Ash!</p>
<p>Từ nay đến 31.12.2025, tham gia cuộc đua săn quà độc quyền bằng cách xem các phim: Avatar: The Way Of Water, Tron: Ares, Predator: Badlands, Zootopia 2 và Avatar: Fire And Ash với định dạng IMAX Laser.</p>
<p>Chinh phục đủ 5 cột mốc điện ảnh, trở thành IMAX Hunter chính hiệu, Stars sẽ nhận "kho báu" ĐỘC QUYỀN chỉ có tại Galaxy Sala, bao gồm:</p>
<ul>
  <li>50 Stars đầu tiên xem đủ 5 phim: Set quà độc quyền Avatar Fire And Ash (01 túi tote, 01 bình giữ nhiệt và 01 pin cài).</li>
  <li>30 Stars tiếp theo xem đủ 5 phim: 01 pin cài Avatar Fire And Ash.</li>
</ul>
<p>Mỗi khi hoàn thành 01 chặng, Stars sẽ được 01 dấu vào tài khoản</p>
<h4>Điều kiện chương trình:</h4>
<ul>
  <li>Quý khách sẽ nhận thông báo về địa điểm, thời gian và cách thức nhận quà qua email.</li>
  <li>Quà tặng không có giá trị quy đổi thành tiền mặt hoặc sản phẩm khác.</li>
  <li>Mỗi khách hàng chỉ được tham gia và nhận quà 01 lần trong suốt chương trình.</li>
  <li>Số lượng quà có hạn, chương trình có thể kết thúc sớm khi quà được phát hết.</li>
  <li>Mọi trường hợp hủy vé hoặc đổi sang phim khác ngoài các phim được qui định trong chương trình sẽ được tính là không hợp lệ.</li>
  <li>Ban tổ chức có quyền kiểm tra, từ chối hoặc hủy bỏ quyền nhận quà nếu phát hiện dấu hiệu gian lận.</li>
  <li>Trong mọi trường hợp, quyết định của Galaxy Cinema là quyết định cuối cùng.</li>
</ul>
<p>Hẹn Stars tại phòng chiếu IMAX Laser - Galaxy Sala (Tầng 3, Thiso Mall Sala, 10 Mai Chí Thọ, Phường An Khánh) cùng trở thành IMAX Hunter nhé!</p>`,
      imageUrl: 'https://www.galaxycine.vn/media/2025/9/24/imax-treasure-hunt-5_1758703687529.jpg',
      thumbnailUrl: 'https://www.galaxycine.vn/media/2025/9/24/imax-treasure-hunt-5_1758703687529.jpg',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      status: 'ACTIVE',
      isFeatured: true,
    },
  ];

  for (const eventData of events) {
    // Ensure slug is set
    if (!eventData.slug) {
      eventData.slug = generateSlug(eventData.title);
    }
    const event = await prisma.event.create({ data: eventData });
    console.log(`✅ Created event: ${event.title} (slug: ${event.slug})`);
  }

  console.log('✨ Seeding completed!');
  console.log('\n=== Summary ===');
  console.log(`📽️  Movies: ${allMovies.length}`);
  console.log(`🎬 Cinemas: ${cinemas.length}`);
  console.log(`🎫 Screenings: ${allMovies.length * 5}`);
  console.log(`💺 Seats per screening: ${ROWS * COLS}`);
  console.log(`🎉 Events: ${events.length}`);
  console.log('\n=== Login Credentials ===');
  console.log('Admin:');
  console.log('  Email: admin@vticinema.com');
  console.log('  Password: admin123');
  console.log('\nUser:');
  console.log('  Email: user@example.com');
  console.log('  Password: user123');
  console.log('========================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
