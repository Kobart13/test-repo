import json, re

with open('matrix-data.js', 'r') as f:
    content = f.read()

match = re.search(r'var MATRIX_DATA\s*=\s*(\{.*\});', content, re.DOTALL)
data = json.loads(match.group(1))

for tab_name in ['Мета экспетность', 'Конверсия']:
    entries = data[tab_name]
    empty_count = 0
    has_topic = 0
    for e in entries:
        if e.get('topic'):
            has_topic += 1
        else:
            empty_count += 1
    print("%s: %d with topic, %d without topic, total=%d" % (tab_name, has_topic, empty_count, len(entries)))

    for i, e in enumerate(entries[:15]):
        print("  [%d] trigger=%s cat=%s topic=%r niche=%s" % (i, e['trigger'], e['category'], e.get('topic',''), e.get('niche','')))
    print()
