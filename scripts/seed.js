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

  console.log('✨ Seeding completed!');
  console.log('\n=== Summary ===');
  console.log(`📽️  Movies: ${allMovies.length}`);
  console.log(`🎬 Cinemas: ${cinemas.length}`);
  console.log(`🎫 Screenings: ${allMovies.length * 5}`);
  console.log(`💺 Seats per screening: ${ROWS * COLS}`);
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
