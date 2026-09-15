import { FileText, Compass, HelpCircle } from 'lucide-react';
import type { SuggestionItem } from '../types.ts';

const SUGGESTIONS: SuggestionItem[] = [
  {
    icon: <FileText size={18} className="text-neutral-300 group-hover:text-white transition-colors" />,
    title: 'Ringkas Dokumen',
    subtitle: 'Rangkum materi utama dari slide atau modul yang diunggah',
    prompt: 'Tolong berikan ringkasan poin-poin penting dari materi kuliah yang ada di dalam dokumen.'
  },
  {
    icon: <Compass size={18} className="text-neutral-300 group-hover:text-white transition-colors" />,
    title: 'Konsep Logika & SAT',
    subtitle: 'Pelajari definisi teknis, proposisi, atau topik terkait',
    prompt: 'Jelaskan konsep logika proposisi dan permasalahan SAT/UNSAT sesuai dokumen rujukan.'
  },
  {
    icon: <HelpCircle size={18} className="text-neutral-300 group-hover:text-white transition-colors" />,
    title: 'Aturan & Kebijakan',
    subtitle: 'Cek jadwal, penilaian, dan tata tertib praktikum',
    prompt: 'Apa saja aturan dan tata tertib perkuliahan yang tercantum di dokumen?'
  }
];

const FAN_CARDS = [
  {
    wrapperClass: 'relative z-10 hover:z-50',
    delayClass: 'animate-delay-100',
    floatClass: 'animate-float-1',
    cardClass:
      'sm:-rotate-8 sm:translate-y-4 sm:origin-bottom-right hover:z-50 hover:sm:rotate-0 hover:-translate-y-6 sm:hover:-translate-y-10 hover:scale-[1.04]'
  },
  {
    wrapperClass: 'relative z-20 hover:z-50',
    delayClass: 'animate-delay-200',
    floatClass: 'animate-float-2',
    cardClass:
      'sm:rotate-0 sm:translate-y-0 sm:origin-bottom hover:z-50 hover:-translate-y-6 sm:hover:-translate-y-10 hover:scale-[1.04]'
  },
  {
    wrapperClass: 'relative z-10 hover:z-50',
    delayClass: 'animate-delay-300',
    floatClass: 'animate-float-3',
    cardClass:
      'sm:rotate-8 sm:translate-y-4 sm:origin-bottom-left hover:z-50 hover:sm:rotate-0 hover:-translate-y-6 sm:hover:-translate-y-10 hover:scale-[1.04]'
  }
];

interface WelcomeHeroProps {
  onSelectSuggestion: (prompt: string) => void;
}

export default function WelcomeHero({ onSelectSuggestion }: WelcomeHeroProps) {
  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col justify-center py-4 sm:py-14 px-3 sm:px-4">
      <div className="mb-6 sm:mb-9 group animate-slide-up-fade">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-snug sm:leading-tight select-none">
          <span className="gemini-gradient-text font-semibold">Halo,</span>
          <br />
          <span className="text-[#444746] group-hover:text-[#72777a] transition-colors duration-300">
            ada materi kuliah yang ingin kamu pelajari hari ini?
          </span>
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center space-y-2.5 sm:space-y-0 sm:-space-x-16 md:-space-x-20 py-2 sm:py-8 relative w-full">
        {SUGGESTIONS.map((item, idx) => {
          const fan = FAN_CARDS[idx] || FAN_CARDS[1];

          return (
            <div
              key={idx}
              className={`w-full max-w-sm sm:w-64 md:w-72 flex justify-center animate-slide-up-fade ${fan.delayClass} ${fan.wrapperClass}`}
            >
              <div className={`w-full flex justify-center ${fan.floatClass}`}>
                <button
                  type="button"
                  onClick={() => onSelectSuggestion(item.prompt)}
                  className={`flex flex-col justify-between w-full min-h-[110px] sm:min-h-[170px] bg-[#1e1f20] hover:bg-[#27282b] active:bg-[#282a2c] border border-white/10 hover:border-white/40 active:border-white/30 rounded-2xl p-3.5 sm:p-5 text-left shadow-2xl shadow-black/80 hover:shadow-black transition-all duration-300 ease-out cursor-pointer group ${fan.cardClass}`}
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center mb-2 sm:mb-3">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-[#e3e3e3] group-hover:text-white transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#8e918f] leading-relaxed mt-0.5 sm:mt-1">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
