export type Category = { id: string; name: string; count: number; icon: string; tone: string };
export type Product = {
  id: string; name: string; brand: string; category: string; categoryId: string;
  price: number; oldPrice: number; rating: number; reviews: number; discount: number;
  image: string; gallery: string[]; badge?: string; stock: number; sold: number;
  specs: { label: string; value: string }[]; tags: string[];
};
export type Article = { id: string; title: string; category: string; date: string; read: string; image: string; excerpt: string };
export type Order = { id: string; date: string; total: number; status: string; items: string[]; color: string };

export const applianceImages = [
  'https://images.pexels.com/photos/5824518/pexels-photo-5824518.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/3637739/pexels-photo-3637739.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/4108806/pexels-photo-4108806.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/5825366/pexels-photo-5825366.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/6585756/pexels-photo-6585756.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/4846097/pexels-photo-4846097.jpeg?auto=compress&cs=tinysrgb&w=900',
];
const ac = (id: string, name: string, brand: string, price: number, image: number, btu: string, inv = true, discount = 18): Product => ({
  id, name, brand, category: 'Điều hòa', categoryId: 'air-conditioner', price, oldPrice: Math.round(price / (1 - discount / 100)), rating: 4.8, reviews: 126 + Number(id.slice(-1) || 1) * 13, discount, image: applianceImages[image], gallery: [applianceImages[image], applianceImages[(image + 1) % applianceImages.length]], badge: discount > 20 ? 'Giá tốt' : 'Bán chạy', stock: 12, sold: 87, specs: [{ label: 'Công suất', value: btu }, { label: 'Công nghệ', value: inv ? 'Inverter' : 'Cơ' }, { label: 'Gas', value: 'R-32' }, { label: 'Bảo hành', value: '12 tháng' }], tags: [btu, inv ? 'Inverter' : 'Tiết kiệm điện', 'Điều khiển Wi-Fi'],
});
const p = (id: string, name: string, brand: string, category: string, categoryId: string, price: number, image: number, specs: { label: string; value: string }[], badge = 'Chính hãng'): Product => ({
  id, name, brand, category, categoryId, price, oldPrice: Math.round(price * 1.15), rating: 4.7, reviews: 58 + Number(id.slice(-1) || 1) * 9, discount: 15, image: applianceImages[image], gallery: [applianceImages[image], applianceImages[(image + 2) % applianceImages.length]], badge, stock: 8, sold: 42, specs, tags: [brand, 'Chính hãng', 'Giao nhanh'],
});

export const categories: Category[] = [
  { id: 'air-conditioner', name: 'Điều hòa', count: 128, icon: 'snowflake', tone: 'sky' },
  { id: 'refrigerator', name: 'Tủ lạnh', count: 96, icon: 'refrigerator', tone: 'indigo' },
  { id: 'washing-machine', name: 'Máy giặt', count: 84, icon: 'waves', tone: 'teal' },
  { id: 'television', name: 'Tivi', count: 146, icon: 'tv', tone: 'violet' },
  { id: 'kitchen', name: 'Nhà bếp', count: 215, icon: 'chef', tone: 'orange' },
  { id: 'water-heater', name: 'Máy nước nóng', count: 42, icon: 'droplets', tone: 'rose' },
  { id: 'vacuum', name: 'Máy hút bụi', count: 57, icon: 'sparkles', tone: 'amber' },
  { id: 'fan', name: 'Quạt điện', count: 63, icon: 'wind', tone: 'cyan' },
  { id: 'small-appliance', name: 'Gia dụng nhỏ', count: 189, icon: 'coffee', tone: 'lime' },
  { id: 'accessories', name: 'Phụ kiện', count: 318, icon: 'plug', tone: 'slate' },
];

export const products: Product[] = [
  ac('ac-01', 'Điều hòa Daikin Inverter 1 HP ATKF25XVMV', 'Daikin', 10490000, 0, '9.000 BTU'),
  ac('ac-02', 'Điều hòa Daikin Inverter 1.5 HP ATKF35XVMV', 'Daikin', 12990000, 1, '12.000 BTU', true, 22),
  ac('ac-03', 'Điều hòa Panasonic Inverter 1.5 HP CU/CS-XU12ZKH-8', 'Panasonic', 13990000, 2, '12.000 BTU', true, 19),
  ac('ac-04', 'Điều hòa LG Inverter 1.5 HP V13WIN', 'LG', 11490000, 3, '12.000 BTU', true, 24),
  ac('ac-05', 'Điều hòa Casper Inverter 1 HP GC-09IS35', 'Casper', 6890000, 4, '9.000 BTU', true, 27),
  ac('ac-06', 'Điều hòa Mitsubishi Electric 1 HP MSY-JW25VF', 'Mitsubishi Electric', 11990000, 5, '9.000 BTU', true, 16),
  ac('ac-07', 'Điều hòa Toshiba Inverter 2 HP RAS-H18U2KCVRG-V', 'Toshiba', 15990000, 0, '18.000 BTU', true, 18),
  ac('ac-08', 'Điều hòa Panasonic 1 HP CU/CS-N9WKH-8', 'Panasonic', 8190000, 1, '9.000 BTU', false, 21),
  p('rf-01', 'Tủ lạnh Samsung Inverter 406 lít RF40C', 'Samsung', 'Tủ lạnh', 'refrigerator', 15490000, 2, [{ label: 'Dung tích', value: '406 lít' }, { label: 'Kiểu tủ', value: 'Multi Door' }, { label: 'Công nghệ', value: 'SpaceMax' }], 'Mới về'),
  p('rf-02', 'Tủ lạnh LG Inverter 474 lít Multi Door LFB47BLGAI', 'LG', 'Tủ lạnh', 'refrigerator', 18990000, 3, [{ label: 'Dung tích', value: '474 lít' }, { label: 'Kiểu tủ', value: '4 cửa' }, { label: 'Công nghệ', value: 'Door Cooling+' }]),
  p('rf-03', 'Tủ lạnh Panasonic Inverter 366 lít NR-BX410GKVN', 'Panasonic', 'Tủ lạnh', 'refrigerator', 12490000, 4, [{ label: 'Dung tích', value: '366 lít' }, { label: 'Kiểu tủ', value: 'Ngăn đá dưới' }, { label: 'Công nghệ', value: 'Prime Fresh+' }]),
  p('rf-04', 'Tủ lạnh Aqua Inverter 344 lít AQR-M390EM(BGB)', 'Aqua', 'Tủ lạnh', 'refrigerator', 8990000, 5, [{ label: 'Dung tích', value: '344 lít' }, { label: 'Kiểu tủ', value: '2 cửa' }, { label: 'Công nghệ', value: 'Twin Inverter' }]),
  p('rf-05', 'Tủ lạnh Sharp Inverter 362 lít SJ-XP400AE-SL', 'Sharp', 'Tủ lạnh', 'refrigerator', 10990000, 0, [{ label: 'Dung tích', value: '362 lít' }, { label: 'Kiểu tủ', value: '2 cửa' }, { label: 'Công nghệ', value: 'J-Tech Inverter' }]),
  p('wm-01', 'Máy giặt LG Inverter 10 kg FV1410S4P', 'LG', 'Máy giặt', 'washing-machine', 10490000, 1, [{ label: 'Khối lượng giặt', value: '10 kg' }, { label: 'Kiểu máy', value: 'Cửa trước' }, { label: 'Công nghệ', value: 'AI DD' }], 'Bán chạy'),
  p('wm-02', 'Máy giặt Samsung Inverter 9 kg WW90T634DLX/SV', 'Samsung', 'Máy giặt', 'washing-machine', 8290000, 2, [{ label: 'Khối lượng giặt', value: '9 kg' }, { label: 'Kiểu máy', value: 'Cửa trước' }, { label: 'Công nghệ', value: 'EcoBubble' }]),
  p('wm-03', 'Máy giặt Panasonic 9 kg NA-F90A9DRV', 'Panasonic', 'Máy giặt', 'washing-machine', 6790000, 3, [{ label: 'Khối lượng giặt', value: '9 kg' }, { label: 'Kiểu máy', value: 'Cửa trên' }, { label: 'Công nghệ', value: 'ActiveFoam' }]),
  p('wm-04', 'Máy giặt Aqua Inverter 10 kg AQD-D1000EW', 'Aqua', 'Máy giặt', 'washing-machine', 6490000, 4, [{ label: 'Khối lượng giặt', value: '10 kg' }, { label: 'Kiểu máy', value: 'Cửa trước' }, { label: 'Công nghệ', value: 'Smart Dosing' }]),
  p('wm-05', 'Máy giặt Toshiba 8.5 kg TW-BK95S2V', 'Toshiba', 'Máy giặt', 'washing-machine', 5790000, 5, [{ label: 'Khối lượng giặt', value: '8.5 kg' }, { label: 'Kiểu máy', value: 'Cửa trước' }, { label: 'Công nghệ', value: 'Greatwaves' }]),
  p('tv-01', 'Smart Tivi Samsung QLED 4K 55 inch QA55Q60DAKXXV', 'Samsung', 'Tivi', 'television', 11990000, 0, [{ label: 'Kích thước', value: '55 inch' }, { label: 'Độ phân giải', value: '4K UHD' }, { label: 'Nền tảng', value: 'Tizen' }], 'Đặc quyền online'),
  p('tv-02', 'Smart Tivi LG OLED evo 4K 55 inch OLED55C4PSA', 'LG', 'Tivi', 'television', 22990000, 1, [{ label: 'Kích thước', value: '55 inch' }, { label: 'Độ phân giải', value: '4K OLED' }, { label: 'Tần số quét', value: '144Hz' }], 'Cao cấp'),
  p('tv-03', 'Smart Tivi Sony 4K 55 inch K-55S30', 'Sony', 'Tivi', 'television', 13490000, 2, [{ label: 'Kích thước', value: '55 inch' }, { label: 'Độ phân giải', value: '4K HDR' }, { label: 'Nền tảng', value: 'Google TV' }]),
  p('tv-04', 'Smart Tivi Samsung Crystal UHD 4K 50 inch UA50DU8000', 'Samsung', 'Tivi', 'television', 8990000, 3, [{ label: 'Kích thước', value: '50 inch' }, { label: 'Độ phân giải', value: '4K UHD' }, { label: 'Nền tảng', value: 'Tizen' }]),
  p('tv-05', 'Smart Tivi QLED TCL 4K 65 inch 65C655', 'TCL', 'Tivi', 'television', 12490000, 4, [{ label: 'Kích thước', value: '65 inch' }, { label: 'Độ phân giải', value: '4K QLED' }, { label: 'Nền tảng', value: 'Google TV' }]),
  p('k-01', 'Nồi chiên không dầu Philips 6.2 lít HD9280/90', 'Philips', 'Nồi chiên', 'kitchen', 3590000, 5, [{ label: 'Dung tích', value: '6.2 lít' }, { label: 'Công suất', value: '2000W' }, { label: 'Điều khiển', value: 'Kết nối Wi-Fi' }]),
  p('k-02', 'Lò vi sóng Sharp 20 lít R-205VN(S)', 'Sharp', 'Lò vi sóng', 'kitchen', 1690000, 0, [{ label: 'Dung tích', value: '20 lít' }, { label: 'Công suất', value: '800W' }, { label: 'Chức năng', value: 'Hâm nóng' }]),
  p('k-03', 'Bếp từ đôi Kangaroo KG498N', 'Kangaroo', 'Bếp điện', 'kitchen', 2790000, 1, [{ label: 'Loại bếp', value: 'Bếp từ đôi' }, { label: 'Công suất', value: '4000W' }, { label: 'Mặt bếp', value: 'Kính Ceramic' }]),
  p('k-04', 'Máy lọc nước RO Karofi KAQ-P95', 'Karofi', 'Máy lọc nước', 'kitchen', 7490000, 2, [{ label: 'Số lõi', value: '10 lõi' }, { label: 'Công suất', value: '20 lít/giờ' }, { label: 'Tính năng', value: 'Nóng - lạnh' }]),
  p('k-05', 'Máy rửa bát Bosch 13 bộ SMS4HVI33E', 'Bosch', 'Máy rửa bát', 'kitchen', 15990000, 3, [{ label: 'Sức chứa', value: '13 bộ' }, { label: 'Độ ồn', value: '46 dB' }, { label: 'Chương trình', value: '6 chương trình' }]),
  p('h-01', 'Máy nước nóng Panasonic 30 lít DH-30HAMVW', 'Panasonic', 'Máy nước nóng', 'water-heater', 3890000, 4, [{ label: 'Dung tích', value: '30 lít' }, { label: 'Công suất', value: '2500W' }, { label: 'An toàn', value: 'ELCB' }]),
  p('v-01', 'Robot hút bụi lau nhà Dreame L10s Ultra', 'Dreame', 'Máy hút bụi', 'vacuum', 14990000, 5, [{ label: 'Lực hút', value: '5.300 Pa' }, { label: 'Thời lượng', value: '210 phút' }, { label: 'Điều khiển', value: 'Ứng dụng' }], 'Quà 1.2 triệu'),
  p('v-02', 'Máy hút bụi không dây Samsung Jet 75E', 'Samsung', 'Máy hút bụi', 'vacuum', 6990000, 0, [{ label: 'Lực hút', value: '200W' }, { label: 'Thời lượng', value: '60 phút' }, { label: 'Hộp bụi', value: '0.8 lít' }]),
  p('f-01', 'Quạt tháp Toshiba F-WSA20(VN)', 'Toshiba', 'Quạt điện', 'fan', 1890000, 1, [{ label: 'Công suất', value: '45W' }, { label: 'Tốc độ', value: '3 mức' }, { label: 'Hẹn giờ', value: '12 giờ' }]),
  p('f-02', 'Quạt điều hòa Kangaroo KG50F79', 'Kangaroo', 'Quạt điều hòa', 'fan', 4290000, 2, [{ label: 'Công suất', value: '120W' }, { label: 'Bình nước', value: '60 lít' }, { label: 'Diện tích', value: '30 m²' }]),
];

export const articles: Article[] = [
  { id: 'a-01', title: 'Chọn công suất điều hòa theo diện tích phòng: Bảng tính nhanh 2024', category: 'Tư vấn mua sắm', date: '12/06/2024', read: '6 phút', image: applianceImages[0], excerpt: 'Từ phòng ngủ nhỏ đến phòng khách rộng, chọn đúng BTU giúp mát nhanh và tiết kiệm điện hơn.' },
  { id: 'a-02', title: 'Inverter là gì? Khi nào nên mua điều hòa Inverter', category: 'Điều hòa', date: '10/06/2024', read: '5 phút', image: applianceImages[1], excerpt: 'Giải mã công nghệ đứng sau những chiếc máy lạnh vận hành êm và bền bỉ.' },
  { id: 'a-03', title: '7 mẹo dùng tủ lạnh tiết kiệm điện trong mùa nóng', category: 'Gia dụng', date: '08/06/2024', read: '4 phút', image: applianceImages[2], excerpt: 'Những thay đổi nhỏ trong cách sắp xếp và sử dụng có thể giảm đáng kể tiền điện mỗi tháng.' },
  { id: 'a-04', title: 'Nên mua tivi bao nhiêu inch cho phòng khách?', category: 'Tivi', date: '04/06/2024', read: '7 phút', image: applianceImages[3], excerpt: 'Khoảng cách xem và độ phân giải là hai yếu tố quan trọng hơn kích thước căn phòng.' },
  { id: 'a-05', title: 'Giặt cửa trước hay cửa trên: khác biệt nằm ở đâu?', category: 'Máy giặt', date: '02/06/2024', read: '5 phút', image: applianceImages[4], excerpt: 'So sánh thực tế về hiệu quả giặt, độ bền và chi phí để cả nhà chọn dễ hơn.' },
  { id: 'a-06', title: 'Vệ sinh điều hòa tại nhà: quy trình 30 phút', category: 'Mẹo hay', date: '29/05/2024', read: '8 phút', image: applianceImages[5], excerpt: 'Bộ lọc sạch giúp luồng gió khỏe, mùi dễ chịu và máy chạy nhẹ hơn.' },
  { id: 'a-07', title: 'Bếp từ có thực sự an toàn hơn bếp gas?', category: 'Nhà bếp', date: '26/05/2024', read: '4 phút', image: applianceImages[0], excerpt: 'Nhìn từ góc độ an toàn, kiểm soát nhiệt và thói quen nấu ăn hằng ngày.' },
  { id: 'a-08', title: '5 công nghệ đáng tiền trên tivi hiện đại', category: 'Tivi', date: '20/05/2024', read: '6 phút', image: applianceImages[1], excerpt: 'HDR, tần số quét, âm thanh vòm và hệ điều hành: đâu là thứ bạn thật sự cần?' },
  { id: 'a-09', title: 'Nhà có trẻ nhỏ nên chọn máy lọc không khí thế nào?', category: 'Sống khỏe', date: '17/05/2024', read: '6 phút', image: applianceImages[2], excerpt: 'Các chỉ số cần quan tâm để căn phòng thoáng sạch, yên tĩnh và dễ chịu.' },
  { id: 'a-10', title: 'Checklist nhận hàng điện máy không bỏ sót chi tiết', category: 'Mua sắm thông minh', date: '12/05/2024', read: '3 phút', image: applianceImages[3], excerpt: 'Kiểm tra ngoại quan, phụ kiện, bảo hành ngay tại nhà để an tâm sử dụng.' },
];

export const orders: Order[] = [
  { id: 'DM365-240618-091', date: '18/06/2024', total: 12990000, status: 'Đang giao', items: ['Điều hòa Daikin Inverter 1.5 HP'], color: 'blue' },
  { id: 'DM365-240602-744', date: '02/06/2024', total: 8990000, status: 'Đã giao', items: ['Tủ lạnh Aqua Inverter 344 lít'], color: 'green' },
  { id: 'DM365-240525-310', date: '25/05/2024', total: 3590000, status: 'Đã giao', items: ['Nồi chiên không dầu Philips'], color: 'green' },
  { id: 'DM365-240501-118', date: '01/05/2024', total: 11490000, status: 'Đã giao', items: ['Điều hòa LG Inverter 1.5 HP'], color: 'green' },
  { id: 'DM365-240426-589', date: '26/04/2024', total: 6790000, status: 'Đã giao', items: ['Máy giặt Panasonic 9 kg'], color: 'green' },
  { id: 'DM365-240401-205', date: '01/04/2024', total: 8290000, status: 'Đã giao', items: ['Máy giặt Samsung Inverter 9 kg'], color: 'green' },
  { id: 'DM365-240312-676', date: '12/03/2024', total: 13490000, status: 'Đã giao', items: ['Smart Tivi Sony 4K 55 inch'], color: 'green' },
  { id: 'DM365-240227-431', date: '27/02/2024', total: 3890000, status: 'Đã giao', items: ['Máy nước nóng Panasonic 30 lít'], color: 'green' },
  { id: 'DM365-240209-918', date: '09/02/2024', total: 6990000, status: 'Đã giao', items: ['Máy hút bụi Samsung Jet 75E'], color: 'green' },
  { id: 'DM365-240115-143', date: '15/01/2024', total: 15490000, status: 'Đã giao', items: ['Tủ lạnh Samsung Multi Door'], color: 'green' },
];