# T09 — живой бенчмарк дедупликации

Запуск: 2026-10-16T16:08:39.879Z
Модели: Qwen/Qwen3-Embedding-8B; typesafe/jev; deepseek/deepseek-v4-flash

11 синтетических русскоязычных контрольных новостей сравнивались с сохраненным корпусом из 20 демонстрационных историй. Проверены дубли и обновления сделок, прямые последствия, разные события одной компании, отдельные сбои сервиса и сделки с другими сторонами. Все запросы прошли через работающий API T09, Qwen Embeddings и JEV; DeepSeek вызывался при сомнениях.

- Проверено новостей: 11
- Точность итогового отношения: 82% (9/11)
- Эталонная статья попала в top‑10: 11/11
- Верно выбрана статья в случаях SAME/RELATED: 100% (8/8)
- Вызовы: Qwen 11, JEV 11, DeepSeek 5
- Токены: Qwen input 1634; JEV input/output 72338/7009; DeepSeek input/output 9747/1234
- Подтвержденная стоимость JEV + DeepSeek: 1.4095 ₽. Embeddings API стоимость не вернул, поэтому Qwen не включен.

| Сценарий | Эталон | Результат | Эталон в top‑10 | Выбранная статья | Уверенность | Решение |
|---|---:|---:|---:|---|---:|---|
| Paraphrased duplicate with amount and project repeated | SAME | SAME | да | «ВекторМаш» получил кредит на строительство завода роботов | 100% | JEV; DeepSeek нет |
| Transaction follow-up with closing date and same parties | SAME | SAME | да | «ТрансЛайн» договорился о покупке 80% «ЭкспрессКарго» | 95% | DeepSeek V4 Flash; DeepSeek вызван |
| Direct operational consequence of supplier bankruptcy, a separate event | RELATED | RELATED | да | Поставщик упаковки «ПолимерСнаб» подал заявление о банкротстве | 95% | JEV; DeepSeek нет |
| Same company and industry, unrelated transaction | DIFFERENT | DIFFERENT | да | — | 95% | DeepSeek V4 Flash; DeepSeek вызван |
| Confirmed cause of the same previously reported outage | SAME | SAME | да | «ФинПоток» опроверг сообщения о взломе платёжного сервиса | 97% | JEV; DeepSeek нет |
| Same service, a different outage on a different date and cause | DIFFERENT | RELATED | да | «ФинПоток» опроверг сообщения о взломе платёжного сервиса | 85% | DeepSeek V4 Flash; DeepSeek вызван |
| Decision update on the same conditional investment project | SAME | SAME | да | «АгроСфера» может заморозить инвестиционный проект | 95% | DeepSeek V4 Flash; DeepSeek вызван |
| A later operational milestone for the factory funded by the loan | RELATED | RELATED | да | «ВекторМаш» получил кредит на строительство завода роботов | 93% | JEV; DeepSeek нет |
| Delivery progress under the same named supply contract | SAME | RELATED | да | «УралТехЭкспорт» заключил контракт на поставку насосов | 85% | JEV; DeepSeek нет |
| Customer adoption milestone after a service launch | RELATED | RELATED | да | «Банк Орбита» и «Клевер Маркет» запустили оплату частями | 89% | JEV; DeepSeek нет |
| Similar acquisition topic but different companies and transaction | DIFFERENT | DIFFERENT | да | — | 97% | DeepSeek V4 Flash; DeepSeek вызван |

## Разбор несовпадений

- Плановое обслуживание «ФинПотока» отнесено к RELATED относительно прежнего сбоя: модель увидела одну платформу, но контекст прямо отделял другое число и причину. В этой разметке ожидается DIFFERENT. Это проверка недостаточности принципа “related = прямое продолжение события”.
- Отгрузка насосов по тому же контракту получила RELATED вместо SAME. Кандидат выбрал верно, но категория связи зависит от договоренности: этот тест считает исполнение того же договора SAME.

## Ограничения

Это синтетический контрольный набор, размеченный вручную, и не независимая оценка на реальном новостном потоке. Уверенность моделей не является калиброванной вероятностью. DeepSeek и JEV вернули фактические usage/cost; стоимость Qwen API не сообщил. Полный список кандидатов, решения и метрики находятся в `results.json`.
