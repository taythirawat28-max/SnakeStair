import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-800 rounded-3xl border border-slate-700 p-6 sm:p-7 shadow-2xl text-left max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <h2 className="text-xl font-bold text-white">กติกาและวิธีเล่นเกมบันไดงู</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <span className="text-2xl shrink-0">🎯</span>
            <div>
              <strong className="text-amber-300 block text-sm mb-0.5">เป้าหมายของเกม</strong>
              ผู้เล่นจะต้องทอดลูกเต๋าและเดินตัวหมากจากช่องที่ 1 ไปยังช่องที่ 100 ผู้ที่ไปถึงช่อง 100 ได้พอดีก่อนจะเป็นผู้ชนะเลิศ!
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-sky-950/60 border border-sky-600/40">
              <div className="flex items-center gap-2 text-sky-400 font-bold mb-1">
                <span className="text-xl">🪜</span>
                <span>ปีนบันได (Ladder)</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                หากตัวเดินของคุณหยุดตรงช่องที่เปรียบเสมือน <strong>&quot;ฐานบันได&quot;</strong> ตัวเดินจะปีนบันไดขึ้นไปยังยอดบันไดทันที ย่นระยะทางได้ไวมาก!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-600/40">
              <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
                <span className="text-xl">🐍</span>
                <span>สไลด์ลงงู (Snake)</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                หากตัวเดินของคุณตกลงที่ <strong>&quot;หัวงู&quot;</strong> ตัวเดินจะไถลลงตามตัวงูลงไปหยุดอยู่ที่หางงู ทำให้ต้องถอยหลังกลับไป!
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700 space-y-2">
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <span>🎲</span>
              <span>การทอดลูกเต๋า &amp; กฎการเข้าเส้นชัย</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
              <li>ผลัดกันทอดลูกเต๋าตามลำดับตาเล่น (Turn) ระบบจะเปิดให้กดทอดเมื่อถึงตาคุณเท่านั้น</li>
              <li>การเข้าเส้นชัย: ผู้เล่นที่ทอดลูกเต๋าแล้วเดินถึงหรือเกินช่องที่ 100 จะเข้าเส้นชัยทันทีและคว้าชัยชนะ ไม่มีย้อนกลับ</li>
              <li>ระบบรองรับผู้เล่น 2-4 คนต่อห้อง หรือจะเพิ่มบอท AI ร่วมเล่นด้วยก็ได้</li>
            </ul>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span>💡</span>
              <span>ส่งรหัสห้องหรือกด &quot;แชร์ลิงก์ห้อง&quot; เพื่อชวนเพื่อนเล่นได้ทันที</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-all cursor-pointer"
          >
            เข้าใจแล้ว เริ่มเล่นเลย
          </button>
        </div>
      </div>
    </div>
  );
};
