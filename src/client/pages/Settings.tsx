import { THEMES, type ThemeId, type ThemeColors } from '../constants/themes';

type SettingsProps = {
  theme: ThemeColors;
  onChangeTheme: (themeId: ThemeId) => void;
  onResetProfile: () => Promise<void>;
  onBack: () => void;
};

export const Settings = ({ theme, onChangeTheme, onResetProfile, onBack }: SettingsProps) => {
  const themesList = Object.values(THEMES);

  const handleReset = async () => {
    const confirm = window.confirm(
      'Are you sure you want to reset your diamonds, achievements, and stats? This cannot be undone.'
    );
    if (confirm) {
      await onResetProfile();
    }
  };

  return (
    <div className={`flex flex-col gap-6 w-full max-w-md mx-auto p-4 ${theme.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3 border-slate-700/30">
        <h2 className={`text-2xl font-bold ${theme.accent || 'text-cyan-400'}`}>Settings</h2>
        <button onClick={onBack} className={theme.btnSecondary}>
          Back
        </button>
      </div>

      {/* Select Theme Card */}
      <div className={`p-5 flex flex-col gap-4 ${theme.cardBg}`}>
        <h3 className="text-lg font-bold">Select Visual Theme</h3>
        <p className="text-xs opacity-65 -mt-2">Customize the board colors, grid styles, and buttons.</p>
        
        <div className="grid grid-cols-2 gap-3">
          {themesList.map((t) => {
            const isSelected = t.id === theme.id;
            return (
              <button
                key={t.id}
                onClick={() => onChangeTheme(t.id)}
                className={`
                  flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all duration-200 cursor-pointer
                  ${isSelected 
                    ? 'border-cyan-400 bg-cyan-500/10 scale-102 shadow-md' 
                    : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/60'}
                `}
              >
                <span className="font-bold text-sm">{t.name}</span>
                <div className="flex gap-1.5 mt-2.5">
                  {t.regionColors.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full ${c.split(' ')[0]} border border-white/10`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset Account Card */}
      <div className={`p-5 flex flex-col gap-4 border-red-500/20 ${theme.cardBg}`}>
        <h3 className="text-lg font-bold text-red-400">Danger Zone</h3>
        <p className="text-xs opacity-65 -mt-2">Resetting clears your diamond cache, solve counts, and active daily streaks.</p>
        <button
          onClick={handleReset}
          className="w-full bg-red-650 hover:bg-red-750 text-white font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors shadow-lg shadow-red-950/20 border border-red-500/30"
        >
          Reset Profile Data
        </button>
      </div>
    </div>
  );
};
