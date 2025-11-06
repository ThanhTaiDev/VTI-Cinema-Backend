const bcrypt = require('bcrypt');
const prisma = require('../src/prismaClient');

async function main() {
  console.log('🌱 Seeding database...');

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

  // Create sample cinemas
  const cinema1 = await prisma.cinema.upsert({
    where: { id: 'cinema-1' },
    update: {},
    create: {
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

  const cinema2 = await prisma.cinema.upsert({
    where: { id: 'cinema-2' },
    update: {},
    create: {
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

  console.log('✅ Sample cinemas created');

  // Helper function to parse duration from "50 phút/tập" or "105 phút"
  const parseDuration = (timeStr) => {
    if (!timeStr) return 120;
    const match = timeStr.match(/(\d+)\s*phút/);
    return match ? parseInt(match[1]) : 120;
  };

  // Create sample movies - NOW_PLAYING
  const movie1 = await prisma.movie.upsert({
    where: { id: 'movie-1' },
    update: {},
    create: {
      id: 'movie-1',
      title: 'Cô Đừng Hòng Thoát Khỏi Tôi',
      slug: 'co-dung-hong-thoat-khoi-toi',
      actors: 'Lê Hải, Lê Phương, Thúy Ngân, Võ Cảnh',
      director: 'Nguyễn Hoàng Anh',
      duration: parseDuration('50 phút/tập'),
      genres: 'Tội phạm, Điều tra',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-11-03'),
      rating: 8.5,
      ageRating: 'T16',
      description: 'Bộ phim khai thác chủ đề buôn người, lừa đảo trực tuyến và điều tra tội phạm xuyên biên giới. Không chỉ khắc họa cuộc đối đầu căng thẳng giữa lực lượng cảnh sát ngầm và đường dây tội phạm tinh vi, phim còn đan xen nhiều mối quan hệ phức tạp giữa yêu – hận – thù – lý tưởng.',
      summary: 'Bộ phim khai thác chủ đề buôn người, lừa đảo trực tuyến và điều tra tội phạm xuyên biên giới.',
      posterUrl: 'https://phim.nguonc.com/public/images/Post/10/co-dung-hong-thoat-khoi-toi.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Post/10/co-dung-hong-thoat-khoi-toi-1.jpg',
      formats: JSON.stringify(['2D']),
      cast: JSON.stringify(['Lê Hải', 'Lê Phương', 'Thúy Ngân', 'Võ Cảnh']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: true,
    },
  });

  const movie2 = await prisma.movie.upsert({
    where: { id: 'movie-2' },
    update: {},
    create: {
      id: 'movie-2',
      title: 'Cuộc Chiến Hạ Lưu',
      slug: 'cuoc-chien-ha-luu',
      actors: 'Thái Hòa, Lê Phương, NSƯT Kim Phương, Trịnh Thảo, NSND Thanh Nam',
      director: 'Mr. Tô',
      duration: parseDuration('40 phút/tập'),
      genres: 'Gia đình, Chính kịch',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-10-28'),
      rating: 8.0,
      ageRating: 'T13',
      description: 'Giữa cuộc chiến mưu sinh khốc liệt nơi đô thị hào nhoáng, một gia đình gồm già trẻ lớn bé trong một xóm nghèo bỗng đứng trước nguy cơ mất đi chốn nương thân duy nhất. Khi biến cố ập đến, quá khứ, bí mật và toan tính riêng của mỗi người dần lộ diện. Liệu họ sẽ cùng nhau vượt qua hay chính những ẩn khuất ấy sẽ xé nát mái ấm mong manh này?',
      summary: 'Giữa cuộc chiến mưu sinh khốc liệt nơi đô thị hào nhoáng, một gia đình gồm già trẻ lớn bé trong một xóm nghèo bỗng đứng trước nguy cơ mất đi chốn nương thân duy nhất.',
      posterUrl: 'https://phim.nguonc.com/public/images/Post/6/cuoc-chien-ha-luu-1.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Post/6/cuoc-chien-ha-luu.jpg',
      formats: JSON.stringify(['2D']),
      cast: JSON.stringify(['Thái Hòa', 'Lê Phương', 'NSƯT Kim Phương', 'Trịnh Thảo', 'NSND Thanh Nam']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: true,
    },
  });

  const movie3 = await prisma.movie.upsert({
    where: { id: 'movie-3' },
    update: {},
    create: {
      id: 'movie-3',
      title: 'Hải Đường Trong Gió',
      slug: 'hai-duong-trong-gio',
      actors: 'Thúy Ngân, Trung Dũng, Lãnh Thanh, Ngân Quỳnh',
      director: 'Nguyễn Hoàng Anh',
      duration: parseDuration('32 phút/tập'),
      genres: 'Tội phạm, Báo thù',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-10-29'),
      rating: 8.8,
      ageRating: 'T16',
      description: 'Phim kể về hành trình nhiều sóng gió xoay quanh Hải Đường (Thúy Ngân) - cô gái có thanh xuân bất hạnh, không chỉ bị cha dượng là ông Dần (Trung Dũng) cưỡng bức mà còn bị hắn vu oan phải vào tù. Sau nhiều biến cố, Hải Đường vì muốn trả thù cha dượng của mình đã gia nhập thế giới ngầm, trở thành "chị đại" điều hành đường dây kinh doanh quán bar, vũ trường.',
      summary: 'Phim kể về hành trình nhiều sóng gió xoay quanh Hải Đường - cô gái có thanh xuân bất hạnh, trở thành "chị đại" điều hành đường dây kinh doanh quán bar, vũ trường.',
      posterUrl: 'https://phim.nguonc.com/public/images/Post/6/hai-duong-trong-gio.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Post/6/hai-duong-trong-gio-1.jpg',
      formats: JSON.stringify(['2D']),
      cast: JSON.stringify(['Thúy Ngân', 'Trung Dũng', 'Lãnh Thanh', 'Ngân Quỳnh']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: false,
    },
  });

  const movie4 = await prisma.movie.upsert({
    where: { id: 'movie-4' },
    update: {},
    create: {
      id: 'movie-4',
      title: 'Detective Conan Movie 23: The Fist of Blue Sapphire',
      slug: 'detective-conan-movie-23-the-fist-of-blue-sapphire',
      actors: null,
      director: null,
      duration: 120,
      genres: 'Hoạt hình, Thám tử',
      countries: 'Nhật Bản',
      releaseDate: new Date('2023-07-18'),
      rating: 9.5,
      ageRating: 'T13',
      description: 'Viên sapphire xanh vĩ đại nhất thế giới, "blue lapis fist", được cho là đã bị chìm trong một con tàu cướp biển vào cuối thế kỷ 19, trên bờ biển Singapore. Một triệu phú địa phương âm mưu lấy lại nó, và khi nó được trưng bày trong một cuộc triển lãm tại khách sạn Marina Sands ở Singapore, một vụ giết người đã xảy ra.',
      summary: 'Viên sapphire xanh vĩ đại nhất thế giới được cho là đã bị chìm trong một con tàu cướp biển vào cuối thế kỷ 19, trên bờ biển Singapore.',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/3383.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/3383.jpg',
      formats: JSON.stringify(['2D', 'IMAX']),
      cast: null,
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: true,
    },
  });

  const movie5 = await prisma.movie.upsert({
    where: { id: 'movie-5' },
    update: {},
    create: {
      id: 'movie-5',
      title: 'Bến Không Chồng',
      slug: 'ben-khong-chong',
      actors: 'Như Quỳnh, Lưu Trọng Ninh, Minh Châu',
      director: 'Lưu Trọng Ninh',
      duration: parseDuration('105 phút'),
      genres: 'Tình cảm, Chính kịch',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-10-13'),
      rating: 8.2,
      ageRating: 'T13',
      description: 'Bến không chồng là bộ phim tình cảm Việt Nam được chuyển thể từ tiểu thuyết cùng tên của nhà văn Dương Hướng. Bộ phim là câu chuyện về làng Đông – một làng quê được đặc tả với những nét văn hóa điển hình Bắc Bộ.',
      summary: 'Bến không chồng là bộ phim tình cảm Việt Nam được chuyển thể từ tiểu thuyết cùng tên của nhà văn Dương Hướng.',
      posterUrl: 'https://phim.nguonc.com/public/images/Post/6/ben-khong-chong-1.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Post/6/ben-khong-chong.jpg',
      formats: JSON.stringify(['2D']),
      cast: JSON.stringify(['Như Quỳnh', 'Lưu Trọng Ninh', 'Minh Châu']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: false,
    },
  });

  const movie6 = await prisma.movie.upsert({
    where: { id: 'movie-6' },
    update: {},
    create: {
      id: 'movie-6',
      title: 'Mưa trên cánh bướm',
      slug: 'mua-tren-canh-buom',
      actors: 'Tú Oanh, Nguyễn Nam Linh, Lê Vũ Long',
      director: 'Linh Duong',
      duration: parseDuration('97 phút'),
      genres: 'Tâm lý, Kinh dị',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-09-15'),
      rating: 7.8,
      ageRating: 'T16',
      description: 'Một người phụ nữ trung niên vô tình phát hiện chồng mình ngoại tình thông qua một trận bóng đá được phát trên sóng truyền hình. Bà quyết định tìm đến một thầy đồng mạng với niềm tin có thể thay đổi được chồng. Thế nhưng, những nghi thức bí ẩn lại vô tình đánh thức một thế lực đen tối trong nhà mà chỉ mình bà Tâm và con gái có thể nhìn thấy.',
      summary: 'Một người phụ nữ trung niên vô tình phát hiện chồng mình ngoại tình, quyết định tìm đến một thầy đồng mạng với niềm tin có thể thay đổi được chồng.',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/zPk3XdI5KhkqUSQEiKfGR1nMb2D.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/m6eXzAXYYcdjmKdRWSL6YZDnlh2.jpg',
      formats: JSON.stringify(['2D']),
      cast: JSON.stringify(['Tú Oanh', 'Nguyễn Nam Linh', 'Lê Vũ Long']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: false,
    },
  });

  const movie7 = await prisma.movie.upsert({
    where: { id: 'movie-7' },
    update: {},
    create: {
      id: 'movie-7',
      title: 'Làng Vũ Đại ngày ấy',
      slug: 'lang-vu-dai-ngay-ay',
      actors: 'Hữu Mười, Bùi Cường, Đức Lưu',
      director: 'Phạm Văn Khoa',
      duration: parseDuration('90 phút'),
      genres: 'Chính kịch, Lịch sử',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-09-06'),
      rating: 8.3,
      ageRating: 'T13',
      description: 'Phim Làng Vũ Đại ngày ấy dù là một tác phẩm điện ảnh chuyển thể từ các tác phẩm văn học vốn đã nổi tiếng trước đó của nhà văn Nam Cao (gồm Sống Mòn, Chí Phèo và Lão Hạc). Phim khắc họa cuộc sống nông thôn cũng như nhiều tầng lớp khác nhau trong xã hội thực dân nửa phong kiến của Việt Nam trước Cách mạng Tháng tám (1945).',
      summary: 'Phim chuyển thể từ các tác phẩm văn học của nhà văn Nam Cao, khắc họa cuộc sống nông thôn và nhiều tầng lớp khác nhau trong xã hội thực dân nửa phong kiến của Việt Nam.',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/3TiEcTIJvdf8AVUaC994MCnSHK0.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/i9Ac0XqphY2deSxdWktOHaeRsUn.jpg',
      formats: JSON.stringify(['2D']),
      cast: JSON.stringify(['Hữu Mười', 'Bùi Cường', 'Đức Lưu']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: false,
    },
  });

  const movie8 = await prisma.movie.upsert({
    where: { id: 'movie-8' },
    update: {},
    create: {
      id: 'movie-8',
      title: 'Thám Tử Kiên: Kỳ Án Không Đầu',
      slug: 'tham-tu-kien-ky-an-khong-dau',
      actors: 'Quốc Huy, Ngọc Diệp, Minh Anh',
      director: 'Victor Vũ',
      duration: parseDuration('131 phút'),
      genres: 'Kinh dị, Thám tử',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-10-10'),
      rating: 8.7,
      ageRating: 'T16',
      description: 'Một chuỗi án mạng kinh hoàng tại một ngôi làng hẻo lánh – nơi liên tiếp xảy ra tám vụ giết người với cùng một đặc điểm rợn người: tất cả nạn nhân đều không còn đầu. Thám Tử Kiên phải đối mặt với vụ án khủng khiếp gây hoang mang tột độ cho dân làng. Ai sẽ là nạn nhân tiếp theo trong chuỗi án mạng rùng rợn? Kiên có tìm ra mấu chốt để lần theo dấu vết hung thủ?',
      summary: 'Một chuỗi án mạng kinh hoàng tại một ngôi làng hẻo lánh – nơi liên tiếp xảy ra tám vụ giết người với cùng một đặc điểm rợn người: tất cả nạn nhân đều không còn đầu.',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/rmhmfqVVUWV4xjoC0uBnelARFmT.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/zHMrhNFgmvLE3rYBQYwFXuUBQMX.jpg',
      formats: JSON.stringify(['2D', '3D']),
      cast: JSON.stringify(['Quốc Huy', 'Ngọc Diệp', 'Minh Anh']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: true,
    },
  });

  const movie9 = await prisma.movie.upsert({
    where: { id: 'movie-9' },
    update: {},
    create: {
      id: 'movie-9',
      title: 'Bộ Tứ Báo Thủ',
      slug: 'bo-tu-bao-thu',
      actors: 'Quốc Anh, Trần Tiểu Vy, Kỳ Duyên',
      director: 'Trấn Thành',
      duration: parseDuration('133 phút'),
      genres: 'Hài, Hành động',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-09-01'),
      rating: 8.0,
      ageRating: 'T13',
      description: 'Bộ tứ báo thủ bao gồm Chét-Xi-Cà, Dì Bốn, Cậu Mười Một, Con Kiều chính thức xuất hiện cùng với phi vụ báo thế kỉ. Nghe nói kế hoạch tiếp theo là ở Đà Lạt, liệu bốn báo thủ sẽ quậy Tết tung nóc cỡ nào?',
      summary: 'Bộ tứ báo thủ bao gồm Chét-Xi-Cà, Dì Bốn, Cậu Mười Một, Con Kiều chính thức xuất hiện cùng với phi vụ báo thế kỉ.',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/1c675BVbmNm1OoshmUWlL3wsgNt.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/xfCtJdLp6lZiBZhrr9OCGhFWXyu.jpg',
      formats: JSON.stringify(['2D', '3D']),
      cast: JSON.stringify(['Quốc Anh', 'Trần Tiểu Vy', 'Kỳ Duyên']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: false,
    },
  });

  const movie10 = await prisma.movie.upsert({
    where: { id: 'movie-10' },
    update: {},
    create: {
      id: 'movie-10',
      title: 'Đèn Âm Hồn',
      slug: 'den-am-hon',
      actors: 'Chiều Xuân, Hạo Khang, Quang Teo',
      director: 'Hoàng Nam',
      duration: parseDuration('101 phút'),
      genres: 'Kinh dị, Tâm linh',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-08-11'),
      rating: 7.5,
      ageRating: 'T16',
      description: 'Lấy cảm hứng từ Chuyện Người Con Gái Nam Xương, Thương một mình nuôi con chờ chồng đi lính trở về. Lĩnh - con trai cô nhặt được một cây đèn, từ đó cậu gọi chiếc bóng trên tường là cha. Nào ngờ đó là đèn âm hồn, có thể đã gọi ác linh về báo thù, gây ra nhiều chuyện ma quái. Liệu chiếc bóng đó có phải chồng của Thương không?',
      summary: 'Lấy cảm hứng từ Chuyện Người Con Gái Nam Xương, Thương một mình nuôi con chờ chồng đi lính trở về. Lĩnh nhặt được một cây đèn âm hồn, gây ra nhiều chuyện ma quái.',
      posterUrl: 'https://phim.nguonc.com/public/images/Post/7/den-am-hon-1.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Post/7/den-am-hon.jpg',
      formats: JSON.stringify(['2D']),
      cast: JSON.stringify(['Chiều Xuân', 'Hạo Khang', 'Quang Teo']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: false,
    },
  });

  const movie11 = await prisma.movie.upsert({
    where: { id: 'movie-11' },
    update: {},
    create: {
      id: 'movie-11',
      title: 'Nhà Gia Tiên',
      slug: 'nha-gia-tien',
      actors: 'Huỳnh Lập, Phương Mỹ Chi, Ngô Phạm Hạnh Thúy',
      director: 'Huỳnh Lập',
      duration: parseDuration('117 phút'),
      genres: 'Hài, Tâm linh',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-07-11'),
      rating: 8.1,
      ageRating: 'T13',
      description: 'Nhà Gia Tiên xoay quanh câu chuyện đa góc nhìn về các thế hệ khác nhau trong một gia đình, có hai nhân vật chính là Gia Minh (Huỳnh Lập) và Mỹ Tiên (Phương Mỹ Chi). Trở về căn nhà gia tiên để quay các video "triệu view" trên mạng xã hội, Mỹ Tiên - một nhà sáng tạo nội dung thuộc thế hệ Z vốn không tin vào chuyện tâm linh, hoàn toàn mất kết nối với gia đình, bất ngờ nhìn thấy Gia Minh - người anh trai đã mất từ lâu.',
      summary: 'Nhà Gia Tiên xoay quanh câu chuyện đa góc nhìn về các thế hệ khác nhau trong một gia đình, có hai nhân vật chính là Gia Minh và Mỹ Tiên.',
      posterUrl: 'https://phim.nguonc.com/public/images/Film/9I1vkFmEGqJiod3lbWFSj47HDo8.jpg',
      backdropUrl: 'https://phim.nguonc.com/public/images/Film/yHdDgzEnFslwfwz2Hzc498lIhFx.jpg',
      formats: JSON.stringify(['2D']),
      cast: JSON.stringify(['Huỳnh Lập', 'Phương Mỹ Chi', 'Ngô Phạm Hạnh Thúy']),
      status: 'NOW_PLAYING',
      isPreSale: false,
      isFeatured: false,
    },
  });

  // Create sample movies - COMING_SOON
  const movie12 = await prisma.movie.upsert({
    where: { id: 'movie-12' },
    update: {},
    create: {
      id: 'movie-12',
      title: 'Robot Hoang Dã',
      slug: 'robot-hoang-da',
      actors: 'Trần Nghĩa',
      director: 'Victor Vũ',
      duration: 124,
      genres: 'Khoa học viễn tưởng, Phiêu lưu',
      countries: 'Việt Nam',
      releaseDate: new Date('2025-12-01'),
      rating: 8.5,
      ageRating: 'T13',
      description: 'Câu chuyện về một robot hoang dã trong tương lai',
      summary: 'Robot Hoang Dã là một bộ phim khoa học viễn tưởng kể về cuộc phiêu lưu của một robot',
      posterUrl: 'https://example.com/robot-hoang-da.jpg',
      backdropUrl: 'https://example.com/robot-backdrop.jpg',
      formats: JSON.stringify(['2D', '3D', 'IMAX']),
      cast: JSON.stringify(['Trần Nghĩa']),
      status: 'COMING_SOON',
      isPreSale: true,
      isFeatured: true,
    },
  });

  const movie13 = await prisma.movie.upsert({
    where: { id: 'movie-13' },
    update: {},
    create: {
      id: 'movie-13',
      title: 'Avengers: Endgame',
      slug: 'avengers-endgame',
      actors: 'Robert Downey Jr., Chris Evans',
      director: 'Anthony Russo, Joe Russo',
      duration: 181,
      genres: 'Hành động, Khoa học viễn tưởng',
      countries: 'Mỹ',
      releaseDate: new Date('2025-12-15'),
      rating: 9.5,
      ageRating: 'T13',
      description: 'Phim siêu anh hùng Marvel',
      summary: 'Avengers: Endgame là phần cuối của series Avengers',
      posterUrl: 'https://example.com/avengers.jpg',
      backdropUrl: 'https://example.com/avengers-backdrop.jpg',
      formats: JSON.stringify(['2D', '3D', 'IMAX']),
      cast: JSON.stringify(['Robert Downey Jr.', 'Chris Evans']),
      status: 'COMING_SOON',
      isPreSale: true,
      isFeatured: true,
    },
  });

  console.log('✅ Sample movies created');

  // Create sample screenings for NOW_PLAYING movies
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  const screenings = [];
  
  // Create multiple screenings for different movies
  const moviesForScreening = [movie1, movie2, movie3, movie4, movie5, movie8];
  const times = [14, 16, 18, 20]; // 14:00, 16:00, 18:00, 20:00
  
  for (let i = 0; i < moviesForScreening.length; i++) {
    const movie = moviesForScreening[i];
    const cinema = i % 2 === 0 ? cinema1 : cinema2;
    const timeIndex = i % times.length;
    const startTime = new Date(tomorrow);
    startTime.setHours(times[timeIndex], 0, 0, 0);
    
    const screening = await prisma.screening.create({
      data: {
        movieId: movie.id,
        cinemaId: cinema.id,
        room: `Phòng ${(i % 3) + 1}`,
        startTime: startTime,
        endTime: new Date(startTime.getTime() + movie.duration * 60000),
        price: 80000 + (i * 5000), // Vary price
      },
    });
    
    screenings.push(screening);
  }

  console.log('✅ Sample screenings created');

  // Create seats for screenings
  const ROWS = 8;
  const COLS = 10;

  for (const screening of screenings) {
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
    console.log(`✅ Created ${ROWS * COLS} seats for screening ${screening.id}`);
  }

  console.log('✨ Seeding completed!');
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
