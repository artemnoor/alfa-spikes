import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Deterministic, offline synthetic benchmark generator. It never calls T08 or any model.
const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '../../..');
const datasets = path.join(project, 'src/blocks/T08/datasets');
const out = here;
const topics = JSON.parse(fs.readFileSync(path.join(datasets, 'iptc-media-topics-tree-en-US.json'), 'utf8'));
const events = JSON.parse(fs.readFileSync(path.join(datasets, 'sentivent-event-tree.json'), 'utf8'));
const genres = JSON.parse(fs.readFileSync(path.join(datasets, 'iptc-genre-tree-en-GB.json'), 'utf8'));

const topicMap = new Map();
function walk(nodes, parents = []) {
  for (const n of nodes) {
    const id = n.value?.qcode ?? n.id;
    const label = n.value?.label ?? n.label;
    const chain = [...parents, { qcode: id, label }];
    topicMap.set(id, { qcode: id, label, path: chain });
    walk(n.children ?? [], chain);
  }
}
walk(topics.roots);
const eventMap = new Map();
function walkEvents(nodes, parent = null) {
  for (const n of nodes) {
    eventMap.set(n.id, { id: n.id, label: n.label, mainType: parent?.label ?? n.label, subType: parent ? n.label : null });
    walkEvents(n.children ?? [], n);
  }
}
walkEvents(events.roots);
const genreMap = new Map();
function walkGenres(nodes) {
  for (const n of nodes) {
    if (n.value?.qcode) genreMap.set(n.value.qcode, { qcode: n.value.qcode, label: n.value.label });
    walkGenres(n.children ?? []);
  }
}
walkGenres(genres.roots);

const companies = ['Северный контур', 'Ладога тех', 'Маяк групп', 'Вектор лаборатории', 'Полюс системы'];
const people = ['Ирина Ветрова', 'Максим Орлов', 'Алина Соколова', 'Денис Миронов', 'Елена Крылова'];
const products = ['Орбита', 'Сфера', 'Пульс', 'Маяк', 'Контур'];
const places = ['Твери', 'Перми', 'Туле', 'Казани', 'Томске'];
const dates = ['12 марта', '7 апреля', '19 мая', '3 июня', '21 сентября'];
const money = ['18 млн рублей', '42 млн рублей', '75 млн рублей', '9 млн рублей', '130 млн рублей'];

// One hand-labelled story family per row; 10 controlled surface variations per family.
// Labels are QCodes/IDs from the local source taxonomies, resolved and validated below.
const seeds = [
  ['ai-launch','medtop:20001298','sentivent:product_service_launch','genre:Current','Компания {ORG} запустила ИИ-платформу «{PRODUCT}». По словам директора {PERSON}, система анализирует обращения клиентов за несколько секунд. Презентация прошла в {LOC} {DATE}; инвестиции составили {MONEY}.'],
  ['ai-opinion','medtop:20001298','sentivent:no_matching_event','genre:Opinion','Мнение: руководитель {ORG} {PERSON} считает, что искусственный интеллект «{PRODUCT}» изменит работу редакций. В колонке автор предупреждает о рисках автоматизации и приводит пример из {LOC}.'],
  ['banking-launch','medtop:20000274','sentivent:product_service_launch','genre:Press_Release','Банк {ORG} представил сервис «{PRODUCT}» для открытия счетов онлайн. Глава проекта {PERSON} сообщил о запуске {DATE} в {LOC}; бюджет разработки — {MONEY}.'],
  ['rates-analysis','medtop:20000371','sentivent:macroeconomics','genre:Analysis','Аналитики обсудили влияние ключевой ставки на кредитование. Экономист {PERSON} из {ORG} ожидает замедления спроса в {LOC}; прогноз опубликован {DATE}.'],
  ['election-news','medtop:20000579','sentivent:no_matching_event','genre:Current','Национальная избирательная комиссия объявила календарь выборов. Представитель {ORG} {PERSON} сообщил, что голосование пройдёт {DATE} в том числе в {LOC}.'],
  ['climate-feature','medtop:20000418','sentivent:no_matching_event','genre:Feature','Как меняется климат региона: жители {LOC} вместе с исследователем {PERSON} из {ORG} наблюдают необычно тёплую весну. Материал подготовлен {DATE}.'],
  ['renewable-investment','medtop:20000257','sentivent:investment','genre:Current','Компания {ORG} вложит средства в солнечную электростанцию рядом с {LOC}. Руководитель {PERSON} оценил проект в {MONEY}; работы начнутся {DATE}.'],
  ['healthcare-launch','medtop:20001354','sentivent:product_service_launch','genre:Current','Медицинская сеть {ORG} открыла цифровой кабинет «{PRODUCT}» для записи к врачам. Врач {PERSON} представил сервис в {LOC} {DATE}.'],
  ['football-result','medtop:20000823','sentivent:no_matching_event','genre:Results_Listings_and_Statistics','Команда «{ORG}» выиграла матч по американскому футболу в {LOC}. Тренер {PERSON} назвал итоговый счёт и отметил решающую игру защиты {DATE}.'],
  ['flood-report','medtop:20000154','sentivent:no_matching_event','genre:Current','После паводка в {LOC} спасатели эвакуировали жителей нескольких улиц. Представитель службы {ORG} {PERSON} сообщил, что уровень воды снизился {DATE}.'],
  ['education-launch','medtop:05000000','sentivent:product_service_launch','genre:Current','Университет {ORG} запустил курс по цифровой грамотности. Преподаватель {PERSON} рассказал о программе в {LOC}; первые занятия начнутся {DATE}.'],
  ['air-transport-deal','medtop:20000338','sentivent:deal','genre:Current','Авиакомпания {ORG} заключила соглашение о новых рейсах из {LOC}. Директор {PERSON} сообщил, что договор стоимостью {MONEY} вступит в силу {DATE}.'],
  ['employment-statistics','medtop:20000365','sentivent:macroeconomics','genre:Results_Listings_and_Statistics','Статистическое ведомство {ORG} опубликовало данные о занятости. Эксперт {PERSON} отметил изменение числа вакансий в {LOC}; отчёт вышел {DATE}.'],
  ['inflation-analysis','medtop:20000370','sentivent:macroeconomics','genre:Analysis','Инфляция в регионе стала предметом нового обзора. Экономист {PERSON} из {ORG} объяснил динамику цен на продукты и услуги в {LOC}; данные относятся к {DATE}.'],
  ['space-launch','medtop:20000739','sentivent:product_service_launch','genre:Current','Инженеры {ORG} представили спутник «{PRODUCT}» для наблюдения за лесами. Руководитель проекта {PERSON} сообщил о начале миссии {DATE}; центр управления находится в {LOC}.'],
  ['housing-policy','medtop:20000628','sentivent:no_matching_event','genre:Current','Муниципалитет {LOC} представил программу обновления жилых кварталов. Представитель {ORG} {PERSON} сообщил, что проект обсудят с жителями {DATE}.'],
  ['agriculture','medtop:20000210','sentivent:revenue_increase','genre:Current','Аграрная компания {ORG} сообщила о росте выручки после сбора урожая. Директор {PERSON} связал результат с поставками из {LOC}; показатель опубликован {DATE}.'],
  ['telecom-launch','medtop:20000226','sentivent:product_service_launch','genre:Press_Release','Производитель {ORG} выпустил маршрутизатор «{PRODUCT}» с поддержкой нового стандарта связи. Инженер {PERSON} показал устройство в {LOC} {DATE}.'],
  ['pharma-trial','medtop:20000223','sentivent:product_service_trial','genre:Current','Фармацевтическая компания {ORG} начала клиническое исследование препарата «{PRODUCT}». Руководитель группы {PERSON} сообщил, что испытания проходят в {LOC} с {DATE}.'],
  ['court-trial','medtop:20000107','sentivent:legal_proceeding','genre:Current','Суд в {LOC} начал рассмотрение дела против компании {ORG}. Адвокат {PERSON} сообщил, что первое заседание состоялось {DATE}.'],
  ['privacy-analysis','medtop:20001300','sentivent:no_matching_event','genre:Analysis','Анализ практик конфиденциальности: специалист {PERSON} из {ORG} объяснил, как сервис «{PRODUCT}» обрабатывает данные пользователей в {LOC}. Материал опубликован {DATE}.'],
  ['wildfire-news','medtop:20001202','sentivent:no_matching_event','genre:Current','Пожарные локализовали лесной пожар возле {LOC}. Сотрудник службы {ORG} {PERSON} сообщил о площади возгорания и завершении работ {DATE}.'],
  ['social-media-launch','medtop:20001182','sentivent:product_service_launch','genre:Current','Компания {ORG} запустила социальную платформу «{PRODUCT}» для местных сообществ. Продуктовый директор {PERSON} представил её в {LOC} {DATE}.'],
  ['tourism-review','medtop:20000331','sentivent:no_matching_event','genre:Review','Обзор поездки в {LOC}: автор {PERSON} оценил новый маршрут, гостиницы и музей, открытый компанией {ORG}. Путеводитель вышел {DATE}.'],
  ['railway-investment','medtop:20000340','sentivent:investment','genre:Current','Оператор {ORG} направит {MONEY} на модернизацию железной дороги рядом с {LOC}. Руководитель {PERSON} рассказал о графике работ {DATE}.'],
  ['cybercrime-court','medtop:20000086','sentivent:legal_proceeding','genre:Current','Суд в {LOC} рассмотрит дело о кибермошенничестве, в котором упоминается компания {ORG}. Представитель обвинения {PERSON} подтвердил дату слушания — {DATE}.'],
  ['drought-report','medtop:20000152','sentivent:no_matching_event','genre:Current','Засуха повлияла на водоснабжение окрестностей {LOC}. Специалист {PERSON} из {ORG} сообщил о временных ограничениях, введённых {DATE}.'],
  ['earthquake-report','medtop:20000153','sentivent:no_matching_event','genre:Current','После землетрясения в {LOC} экстренные службы проверили здания. Координатор {ORG} {PERSON} сообщил, что обследование завершилось {DATE}.'],
  ['election-forecast','medtop:20000579','sentivent:no_matching_event','genre:Forecast','Прогноз: политолог {PERSON} ожидает конкурентную кампанию на национальных выборах. Исследование центра {ORG} охватывает избирателей в {LOC} и опубликовано {DATE}.'],
  ['ai-interview','medtop:20001298','sentivent:no_matching_event','genre:Interview','Интервью с экспертом {PERSON} из {ORG}: как система «{PRODUCT}» помогает исследовать данные и где заканчиваются её возможности. Разговор записан в {LOC} {DATE}.'],
];

const splits = ['train', 'dev', 'test'];
const counts = Object.fromEntries(splits.map(s => [s, 0]));
const news = [];
const gold = [];
const pick = (arr, i, offset = 0) => arr[(i + offset) % arr.length];
for (const [familyIndex, [slug, topicId, eventId, genreId, template]] of seeds.entries()) {
  const split = familyIndex % 10 < 7 ? 'train' : familyIndex % 10 < 8 ? 'dev' : 'test';
  const topic = topicMap.get(topicId);
  const event = eventMap.get(eventId);
  const genre = genreMap.get(genreId);
  if (!topic || !event || !genre) throw new Error(`Unresolved label in ${slug}: ${topicId}, ${eventId}, ${genreId}`);
  for (let v = 0; v < 10; v++) {
    const idx = familyIndex * 10 + v;
    const values = {
      ORG: pick(companies, idx), PERSON: pick(people, idx, 1), PRODUCT: pick(products, idx, 2),
      LOC: pick(places, idx, 3), DATE: pick(dates, idx, 4), MONEY: pick(money, idx, 1),
    };
    const body = template.replace(/\{(ORG|PERSON|PRODUCT|LOC|DATE|MONEY)\}/g, (_, k) => values[k]);
    const title = `${topic.label[0].toLocaleUpperCase('ru-RU')}${topic.label.slice(1)}: ${values.ORG} — ${values.PRODUCT}`;
    const id = `${slug}-${String(v + 1).padStart(2, '0')}`;
    const entities = Object.entries(values)
      .filter(([, value]) => title.includes(value) || body.includes(value))
      .map(([type, text]) => ({ type, text }));
    news.push({ id, familyId: slug, split, language: 'ru', title, body, text: `${title}\n${body}` });
    gold.push({ id, familyId: slug, topic, event, genre, entities });
    counts[split]++;
  }
}

const writeLines = (name, rows) => fs.writeFileSync(path.join(out, name), rows.map(x => JSON.stringify(x)).join('\n') + '\n');
writeLines('news.jsonl', news);
writeLines('gold-labels.jsonl', gold);
const by = (rows, fn) => Object.fromEntries([...new Set(rows.map(fn))].sort().map(k => [k, rows.filter(r => fn(r) === k).length]));
const manifest = {
  name: 'T08 Synthetic News Classification Benchmark', version: '1.0.0', generatedAt: 'reproducible',
  synthetic: true, modelEvaluated: false, records: news.length, storyFamilies: seeds.length,
  splitPolicy: 'split is assigned by familyId before variants; all variants in a family stay together',
  splits: counts,
  distributions: {
    topicQCode: by(gold, x => x.topic.qcode),
    eventId: by(gold, x => x.event.id),
    genreQCode: by(gold, x => x.genre.qcode),
  },
  taxonomies: {
    topic: { name: topics.dataset, source: topics.source, license: topics.license },
    event: { name: events.dataset, source: events.source },
    genre: { name: genres.dataset, source: genres.source, license: genres.license },
  },
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Generated ${news.length} synthetic records across ${seeds.length} families: ${JSON.stringify(counts)}`);
