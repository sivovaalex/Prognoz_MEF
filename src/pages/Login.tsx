import { useState } from 'react';
import { GERB_MO } from '@/assets/gerb-mo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col relative overflow-hidden">
      {/* Псевдо-фон города можно добавить позже */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        
        {/* Заголовок */}
        <div className="text-center mb-8 max-w-2xl">
          <img src={GERB_MO} alt="Герб МО" className="h-16 mx-auto mb-4" />
          <h1 className="text-sm font-semibold text-slate-800 leading-tight">
            МОНИТОРИНГ СОЦИАЛЬНО-ЭКОНОМИЧЕСКОГО РАЗВИТИЯ МОСКОВСКОЙ ОБЛАСТИ<br/>
            С ИСПОЛЬЗОВАНИЕМ ТИПОВОГО РЕГИОНАЛЬНОГО СЕГМЕНТА ГАС «УПРАВЛЕНИЕ»
          </h1>
          <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wide">
            Автоматизированная информационно-аналитическая система
          </p>
        </div>

        {/* Карточка */}
        <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl overflow-hidden flex min-h-[400px]">
          {/* Левая часть */}
          <div className="w-5/12 bg-[#2a4365] p-8 text-white flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Прогноз<br/>Московской области</h2>
            </div>
            {/* Плейсхолдер для иллюстрации */}
            <div className="flex-1 flex items-end justify-center">
               <div className="w-full h-48 bg-white/10 rounded-md border border-white/20 flex items-center justify-center text-white/50 text-sm text-center p-4">
                  Иллюстрация (работники)
               </div>
            </div>
          </div>

          {/* Правая часть (Форма) */}
          <div className="w-7/12 p-8 flex flex-col justify-center">
            <h2 className="text-xl font-semibold mb-6 text-slate-800">Авторизация</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs text-slate-500">Логин</Label>
                <Input 
                  id="username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-blue-50/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs text-slate-500">Пароль</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-blue-50/50"
                  required
                />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="remember" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <Label htmlFor="remember" className="text-xs text-slate-600 cursor-pointer">Запомнить</Label>
                </div>
                <a href="#" className="text-xs text-blue-600 hover:underline">
                  Восстановление пароля
                </a>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full bg-[#2a4365] hover:bg-[#1e324d] text-white">
                  Войти
                </Button>
              </div>
              
              <div className="text-center pt-4">
                <a href="#" className="text-[10px] text-blue-500 hover:underline">
                  Служба поддержки пользователей
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="w-full text-center p-4 text-[10px] text-slate-500 border-t bg-white z-10">
        Все заявки в службу технической поддержки ГАСУ МО должны направляться только через Портал технической поддержки.
      </div>
    </div>
  );
}
