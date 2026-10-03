/**
 * Блок «Факт вечера». Тексты — дословно из ТЗ (docs/TZ.md); ссылки — DOI, сверены с Crossref.
 * Корреляцию не выдаём за причину: тип доказательства показывается бейджем на карточке.
 */

export type Evidence = "эксперимент" | "метаанализ" | "наблюдение" | "исследование" | "расчёт";
export type FactCategory = "Здоровье" | "Мозг" | "Сон" | "Люди" | "Привычка" | "Расчёт" | "Про вас";

export type Fact = {
  id: number;
  category: FactCategory;
  title: string;
  text: string;
  evidence: Evidence;
  source: string;
  /** DOI или страница журнала; у расчётов ссылки нет */
  url?: string;
};

/** Пояснение к бейджу — честно о силе доказательств. */
export const evidenceHint: Record<Evidence, string> = {
  "эксперимент": "проверено в контролируемом эксперименте",
  "метаанализ": "сводка многих исследований",
  "наблюдение": "связь, не причина",
  "исследование": "наблюдение за участниками во времени",
  "расчёт": "арифметика, не исследование",
};

const BAVISHI = "https://doi.org/10.1016/j.socscimed.2016.07.014";
const WILSON = "https://doi.org/10.1212/WNL.0b013e31829c5e8a";
const CHANG = "https://doi.org/10.1073/pnas.1418490112";
const LALLY = "https://doi.org/10.1002/ejsp.674";

export const facts: Fact[] = [
  {
    id: 1, category: "Здоровье", title: "+23 месяца",
    text: "В 12-летнем наблюдении за 3 635 людьми 50+ читатели книг прожили в среднем почти на 2 года дольше нечитающих; риск смерти ниже примерно на 20% с поправкой на образование, доход и здоровье.",
    evidence: "наблюдение", source: "Bavishi, Slade, Levy, Social Science & Medicine, 2016", url: BAVISHI,
  },
  {
    id: 2, category: "Здоровье", title: "Полчаса хватает",
    text: "Связь с долголетием была заметна уже у тех, кто читал около 30 минут в день, и росла с объёмом чтения.",
    evidence: "наблюдение", source: "Bavishi et al., 2016", url: BAVISHI,
  },
  {
    id: 3, category: "Здоровье", title: "Книги > ленты",
    text: "Чтение книг было связано с бо́льшим выигрышем, чем чтение газет и журналов: книги сильнее нагружают мозг.",
    evidence: "наблюдение", source: "Bavishi et al., 2016", url: BAVISHI,
  },
  {
    id: 4, category: "Мозг", title: "−32%",
    text: "У людей с частой умственной активностью (чтение, письмо) память в старости снижалась на 32% медленнее, чем у людей со средней активностью.",
    evidence: "наблюдение", source: "Wilson et al., Neurology, 2013", url: WILSON,
  },
  {
    id: 5, category: "Мозг", title: "Никогда не поздно",
    text: "В том же исследовании значение имела активность и в молодости, и в пожилом возрасте — начинать можно в любой момент.",
    evidence: "наблюдение", source: "Wilson et al., 2013", url: WILSON,
  },
  {
    id: 6, category: "Сон", title: "Бумага перед сном",
    text: "Читая с подсвеченного планшета, люди засыпали примерно на 10 минут дольше, мелатонин подавлялся, утром были менее бодры. С бумажной книгой такого эффекта не было.",
    evidence: "эксперимент", source: "Chang et al., PNAS, 2015", url: CHANG,
  },
  {
    id: 7, category: "Сон", title: "E-ink — почти бумага",
    text: "Ридер на электронных чернилах без подсветки отражает свет, как страница, — в отличие от экрана телефона.",
    evidence: "эксперимент", source: "Chang et al., 2015", url: CHANG,
  },
  {
    id: 8, category: "Мозг", title: "Бумага понятнее",
    text: "Метаанализ 54 исследований: научпоп и учебные тексты на бумаге понимаются лучше, чем с экрана. Для художественных текстов разницы почти нет.",
    evidence: "метаанализ", source: "Delgado et al., Educational Research Review, 2018",
    url: "https://doi.org/10.1016/j.edurev.2018.09.003",
  },
  {
    id: 9, category: "Люди", title: "Худлит и эмпатия",
    text: "Чтение художественной литературы даёт небольшое, но устойчивое улучшение в понимании мыслей и чувств других людей.",
    evidence: "метаанализ", source: "Dodell-Feder & Tamir, J. Exp. Psychology: General, 2018",
    url: "https://doi.org/10.1037/xge0000395",
  },
  {
    id: 10, category: "Привычка", title: "66 дней",
    text: "В среднем новая ежедневная привычка становится автоматической примерно за 66 дней; разброс — от 18 до 254. Не 21.",
    evidence: "исследование", source: "Lally et al., European J. of Social Psychology, 2010", url: LALLY,
  },
  {
    id: 11, category: "Привычка", title: "Пропуск не страшен",
    text: "Один пропущенный день заметно не мешает формированию привычки. Поэтому у нас есть заморозка.",
    evidence: "исследование", source: "Lally et al., 2010", url: LALLY,
  },
  {
    id: 12, category: "Привычка", title: "Но регулярность решает",
    text: "У тех, кто выполнял действие очень нерегулярно, привычка так и не сформировалась.",
    evidence: "исследование", source: "Lally et al., 2010", url: LALLY,
  },
  {
    id: 13, category: "Привычка", title: "Если — то",
    text: "План «если почистил зубы — открываю книгу» заметно повышает шанс довести дело до конца: средне-большой эффект в 94 исследованиях.",
    evidence: "метаанализ", source: "Gollwitzer & Sheeran, 2006",
    url: "https://doi.org/10.1016/S0065-2601(06)38002-1",
  },
  {
    id: 14, category: "Расчёт", title: "1,8 млн слов",
    text: "20 минут × ~250 слов в минуту ≈ 5 000 слов за вечер ≈ 1,8 млн слов в год — это 15–20 книг среднего объёма.",
    evidence: "расчёт", source: "Скорость чтения взрослого 200–300 слов/мин",
  },
  {
    id: 15, category: "Расчёт", title: "120 часов",
    text: "20 минут в день — это около 120 часов в год. Как три рабочие недели, целиком отданные книгам.",
    evidence: "расчёт", source: "20 × 365 = 7 300 мин",
  },
];

/** Факт, который показываем, если вчера был пропуск: один пропуск не ломает привычку. */
export const MISSED_DAY_FACT_ID = 11;

/** Данные пользователя и группы для персональных фактов. */
export type PersonalContext = {
  /** страниц прочитано пользователем */
  pages: number;
  /** вечеров, засчитанных пользователю */
  days: number;
  /** страниц прочитано группой */
  groupPages: number;
  /** текущая серия пользователя */
  streak: number;
};

const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many;
};
const fmt = (n: number) => n.toLocaleString("ru-RU");

type PersonalTemplate = {
  key: string;
  when: (c: PersonalContext) => boolean;
  title: (c: PersonalContext) => string;
  text: (c: PersonalContext) => string;
  evidence: Evidence;
  source: string;
  url?: string;
};

/**
 * Шаблоны из ТЗ. Текст дословный, только числительные согласованы с числом
 * («1 вечер», «2 книги»). Условия не дают показать нули и отрицательные числа.
 */
export const personalTemplates: PersonalTemplate[] = [
  {
    key: "words", when: (c) => c.pages > 0,
    title: (c) => `${fmt(c.pages * 250)} слов`,
    text: (c) => `Вы прочитали ${fmt(c.pages)} стр. — это примерно ${fmt(c.pages * 250)} слов`,
    evidence: "расчёт", source: "Ваши отметки · ~250 слов на странице",
  },
  {
    key: "to66", when: (c) => c.days < 66,
    title: (c) => `${66 - c.days} ${plural(66 - c.days, "вечер", "вечера", "вечеров")}`,
    text: (c) => `До медианных 66 дней привычки осталось ${66 - c.days} ${plural(66 - c.days, "вечер", "вечера", "вечеров")}`,
    evidence: "расчёт", source: "Ваши отметки · Lally et al., 2010", url: LALLY,
  },
  {
    key: "past66", when: (c) => c.days >= 66,
    title: () => "66 дней",
    text: () => "66 дней позади — по исследованию Lally, привычка у вас, скорее всего, уже на автомате",
    evidence: "расчёт", source: "Ваши отметки · Lally et al., 2010", url: LALLY,
  },
  {
    key: "group", when: (c) => c.groupPages >= 300,
    title: (c) => `${fmt(c.groupPages)} стр.`,
    text: (c) => {
      const books = Math.round(c.groupPages / 300);
      return `Вместе вы прочитали ${fmt(c.groupPages)} стр. ≈ ${books} ${plural(books, "книга", "книги", "книг")} среднего объёма`;
    },
    evidence: "расчёт", source: "Отметки группы · ~300 стр. в книге",
  },
  {
    key: "streak", when: (c) => c.streak >= 3,
    title: (c) => `${c.streak} ${plural(c.streak, "вечер", "вечера", "вечеров")}`,
    text: (c) => `Ваша серия — ${c.streak} ${plural(c.streak, "вечер", "вечера", "вечеров")}. Один пропуск её не обнулит — для этого есть заморозка`,
    evidence: "расчёт", source: "Ваши отметки",
  },
];

/** Карточка для показа: обычный факт или собранный из шаблона. */
export type ShownFact = Omit<Fact, "id"> & { id: string; personal: boolean };

export function toShown(f: Fact): ShownFact {
  return { ...f, id: `f${f.id}`, personal: false };
}

/** Применимые персональные факты; пусто, если данных не хватает. */
export function personalFacts(c: PersonalContext): ShownFact[] {
  return personalTemplates.filter((t) => t.when(c)).map((t) => ({
    id: `p-${t.key}`, personal: true, category: "Про вас",
    title: t.title(c), text: t.text(c), evidence: t.evidence, source: t.source, url: t.url,
  }));
}
