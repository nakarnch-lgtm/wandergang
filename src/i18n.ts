import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Dashboard": "Dashboard",
      "My Trips": "My Trips",
      "Savings": "Savings",
      "Feed": "Feed",
      "Community": "Community",
      "Settings": "Settings",
      "Admin Panel": "Admin Panel",
      "Welcome back to WanderGang": "Welcome back to WanderGang",
      "Search": "Search...",
      "Join Trip": "Join Trip",
      "Funded": "Funded",
      "participants joined": "participants joined",
      "Goal": "Goal",
      "Welcome Back!": "Welcome Back!",
      "Login to your WanderGang account": "Login to your WanderGang account",
      "Login": "Login",
      "Register": "Register",
      "Don't have an account?": "Don't have an account?",
      "Already have an account?": "Already have an account?",
      "Email": "Email",
      "Password": "Password",
      "Total Funds Raised": "Total Funds Raised",
      "Pending Approvals": "Pending Approvals",
      "Total Members": "Total Members",
      "Pending Slips": "Pending Slips",
      "No pending slips": "No pending slips"
    }
  },
  th: {
    translation: {
      "Dashboard": "หน้าหลัก",
      "My Trips": "ทริปของฉัน",
      "Savings": "เงินสะสม",
      "Feed": "กระดานข่าว",
      "Community": "คอมมูนิตี้",
      "Settings": "ตั้งค่า",
      "Admin Panel": "แผงควบคุม",
      "Welcome back to WanderGang": "ยินดีต้อนรับกลับสู่ WanderGang",
      "Search": "ค้นหา...",
      "Join Trip": "เข้าร่วมทริป",
      "Funded": "ระดมทุนแล้ว",
      "participants joined": "ผู้เข้าร่วม",
      "Goal": "เป้าหมาย",
      "Welcome Back!": "ยินดีต้อนรับ!",
      "Login to your WanderGang account": "เข้าสู่ระบบบัญชี WanderGang ของคุณ",
      "Login": "เข้าสู่ระบบ",
      "Register": "สมัครสมาชิก",
      "Don't have an account?": "ยังไม่มีบัญชีผู้ใช้?",
      "Already have an account?": "มีบัญชีผู้ใช้อยู่แล้ว?",
      "Email": "อีเมล",
      "Password": "รหัสผ่าน",
      "Total Funds Raised": "เงินทุนทั้งหมด",
      "Pending Approvals": "รอการอนุมัติ",
      "Total Members": "จำนวนสมาชิก",
      "Pending Slips": "สลิปที่รอตรวจสอบ",
      "No pending slips": "ไม่มีสลิปที่รอตรวจสอบ"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
