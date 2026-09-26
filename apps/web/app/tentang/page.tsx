import {
  ArrowRight,
  BookOpen,
  Globe2,
  Lightbulb,
  Users,
} from "lucide-react";

const pillars = [
  {
    icon: Users,
    title: "People",
    description:
      "Menghubungkan manusia dengan pengetahuan, komunitas, dan peluang untuk berkembang bersama.",
  },
  {
    icon: BookOpen,
    title: "Knowledge",
    description:
      "Membuka akses terhadap buku, jurnal, penelitian, repositori, dan berbagai sumber pembelajaran.",
  },
  {
    icon: Lightbulb,
    title: "Technology",
    description:
      "Memanfaatkan teknologi digital dan AI untuk membuat pencarian, pembelajaran, dan pengelolaan informasi menjadi lebih mudah.",
  },
  {
    icon: Globe2,
    title: "Opportunities",
    description:
      "Membangun ruang digital yang dapat mempertemukan pengetahuan dengan peluang baru.",
  },
];

export default function TentangPage() {
  return (
    <main className="usefect-about-page">
      <section className="usefect-about-hero">
        <div className="usefect-about-glow" />

        <div className="usefect-about-hero-content">
          <span className="usefect-about-eyebrow">ABOUT USEFECT</span>

          <h1>
            A Smarter Tomorrow,
            <br />
            Together.
          </h1>

          <p>
            USEFECT adalah platform digital yang dibangun untuk menghubungkan
            manusia, pengetahuan, teknologi, dan peluang dalam satu ekosistem
            yang terus berkembang.
          </p>
        </div>
      </section>

      <section className="usefect-about-section">
        <div className="usefect-about-heading">
          <span>OUR PURPOSE</span>
          <h2>Menghubungkan apa yang kita tahu dengan apa yang bisa kita lakukan.</h2>
          <p>
            Kami percaya bahwa akses terhadap informasi yang baik seharusnya
            menjadi awal dari sesuatu yang lebih besar. USEFECT hadir untuk
            membuat pengetahuan lebih mudah ditemukan, dipahami, dan digunakan.
          </p>
        </div>

        <div className="usefect-about-pillars">
          {pillars.map(({ icon: Icon, title, description }) => (
            <article className="usefect-about-card" key={title}>
              <div className="usefect-about-card-icon">
                <Icon size={22} strokeWidth={1.8} />
              </div>

              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="usefect-about-platform">
        <div>
          <span>THE PLATFORM</span>
          <h2>Satu ekosistem. Banyak kemungkinan.</h2>
        </div>

        <p>
          USEFECT dikembangkan sebagai fondasi digital yang dapat berkembang
          bersama kebutuhan penggunanya — mulai dari perpustakaan digital,
          pencarian pengetahuan, AI, hingga berbagai layanan digital lainnya.
        </p>

        <div className="usefect-about-link">
          <span>Knowledge without boundaries.</span>
          <ArrowRight size={18} />
        </div>
      </section>

      <section className="usefect-about-footer">
        <span>USEFECT</span>
        <h2>A smarter tomorrow, together.</h2>
        <p>
          Dibangun untuk belajar, menemukan, terhubung, dan berkembang.
        </p>
      </section>
    </main>
  );
}
