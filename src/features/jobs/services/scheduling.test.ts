import { describe, it, expect } from 'vitest';
import { findNextAvailableSlot } from './scheduling';

describe('findNextAvailableSlot', () => {
  it('retorna o início do expediente quando não há jobs existentes', () => {
    const slot = findNextAvailableSlot([], 60);
    expect(slot).toEqual({ start: '07:00', end: '08:00' });
  });

  it('encontra um espaço antes do primeiro job quando ele é grande o suficiente', () => {
    const jobs = [{ start_time: '09:00', end_time: '10:00' }];
    const slot = findNextAvailableSlot(jobs, 60);
    expect(slot).toEqual({ start: '07:00', end: '08:00' });
  });

  it('pula para depois do job quando o espaço antes dele é pequeno demais', () => {
    const jobs = [{ start_time: '07:30', end_time: '09:00' }];
    const slot = findNextAvailableSlot(jobs, 60);
    // Gap 07:00-07:30 (30min) não cabe uma duração de 60min; próximo espaço é após o job.
    expect(slot).toEqual({ start: '09:00', end: '10:00' });
  });

  it('encaixa no espaço entre dois jobs consecutivos quando ele é suficiente', () => {
    const jobs = [
      { start_time: '07:00', end_time: '08:00' },
      { start_time: '10:00', end_time: '11:00' },
    ];
    const slot = findNextAvailableSlot(jobs, 90);
    expect(slot).toEqual({ start: '08:00', end: '09:30' });
  });

  it('retorna o espaço após o último job quando a agenda está cheia até lá (jobs consecutivos)', () => {
    const jobs = [
      { start_time: '07:00', end_time: '12:00' },
      { start_time: '12:00', end_time: '18:00' },
    ];
    const slot = findNextAvailableSlot(jobs, 60);
    expect(slot).toEqual({ start: '18:00', end: '19:00' });
  });

  it('ordena jobs desordenados por start_time antes de calcular', () => {
    const jobs = [
      { start_time: '14:00', end_time: '15:00' },
      { start_time: '07:00', end_time: '08:00' },
    ];
    const slot = findNextAvailableSlot(jobs, 300);
    // Após ordenar: 07-08 e 14-15. Gap 08:00-14:00 (360min) cabe 300min.
    expect(slot).toEqual({ start: '08:00', end: '13:00' });
  });

  it('retorna null quando a duração excede o restante do dia de trabalho', () => {
    const jobs = [{ start_time: '07:00', end_time: '21:00' }];
    const slot = findNextAvailableSlot(jobs, 120);
    // Restam apenas 60min (21:00-22:00) para uma duração de 120min.
    expect(slot).toBeNull();
  });

  it('aceita encaixe exato na borda do fim do expediente (limite >=)', () => {
    const jobs = [{ start_time: '07:00', end_time: '21:00' }];
    const slot = findNextAvailableSlot(jobs, 60);
    expect(slot).toEqual({ start: '21:00', end: '22:00' });
  });

  it('retorna null quando o job termina exatamente no fim do expediente', () => {
    const jobs = [{ start_time: '07:00', end_time: '22:00' }];
    const slot = findNextAvailableSlot(jobs, 30);
    expect(slot).toBeNull();
  });

  it('ignora jobs sem start_time ou end_time (dados incompletos)', () => {
    const jobs = [
      { start_time: null, end_time: null },
      { start_time: '09:00', end_time: null },
      { start_time: null, end_time: '10:00' },
    ];
    const slot = findNextAvailableSlot(jobs, 60);
    // Todos filtrados: comporta-se como se não houvesse jobs.
    expect(slot).toEqual({ start: '07:00', end: '08:00' });
  });

  it('mantém o maior horário de término quando jobs de entrada se sobrepõem', () => {
    // Dois jobs no mesmo intervalo (conflito pré-existente na mesma máquina):
    // o segundo job termina mais cedo que o primeiro, então currentStart não deve retroceder.
    const jobs = [
      { start_time: '07:00', end_time: '12:00' },
      { start_time: '08:00', end_time: '09:00' },
    ];
    const slot = findNextAvailableSlot(jobs, 60);
    expect(slot).toEqual({ start: '12:00', end: '13:00' });
  });

  it('respeita workDayStart e workDayEnd customizados (troca de turno)', () => {
    const jobs = [{ start_time: '15:00', end_time: '18:00' }];
    const slot = findNextAvailableSlot(jobs, 120, '14:00', '23:00');
    // Gap 14:00-15:00 (60min) não cabe 120min; próximo espaço é após o job, dentro do turno customizado.
    expect(slot).toEqual({ start: '18:00', end: '20:00' });
  });

  it('retorna null quando workDayStart/workDayEnd são inválidos', () => {
    const slot = findNextAvailableSlot([], 60, 'invalido', '22:00');
    expect(slot).toBeNull();
  });

  it('retorna null quando um job com horário inválido bloqueia o cálculo do espaço final', () => {
    const jobs = [
      { start_time: '10:00', end_time: '11:00' },
      { start_time: 'invalido', end_time: 'invalido' },
    ];
    // Gap antes do job válido (07:00-10:00 = 180min) não cabe 300min, então o
    // algoritmo avança currentStart até o job inválido, cujo parse falha
    // (isValid === false) e por isso não há um espaço final calculável.
    const slot = findNextAvailableSlot(jobs, 300);
    expect(slot).toBeNull();
  });
});
