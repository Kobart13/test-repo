import json
from collections import defaultdict

with open('BLOG/GetCourse/SNP/KontentMatritsa/matrix_data.json','r') as f:
    data = json.load(f)

# Check structure of Мета экспетность
exp = data['Мета экспетность']
print('=== Мета экспетность ===')
print(f'Total entries: {len(exp)}')

groups = defaultdict(list)
for i,item in enumerate(exp):
    key = (item.get('category',''), item.get('trigger',''), item.get('topic',''))
    groups[key].append(item.get('niche',''))

print(f'Unique trigger+category+topic groups: {len(groups)}')
multi = {k:v for k,v in groups.items() if len(v) > 1}
print(f'Groups with multiple niches: {len(multi)}')
for k,v in list(multi.items())[:5]:
    print(f'  {k}: {v}')

# Same for Конверсия
conv = data['Конверсия']
print()
print('=== Конверсия ===')
print(f'Total entries: {len(conv)}')
groups2 = defaultdict(list)
for i,item in enumerate(conv):
    key = (item.get('category',''), item.get('trigger',''), item.get('topic',''))
    groups2[key].append(item.get('niche',''))
print(f'Unique trigger+category+topic groups: {len(groups2)}')
multi2 = {k:v for k,v in groups2.items() if len(v) > 1}
print(f'Groups with multiple niches: {len(multi2)}')
for k,v in list(multi2.items())[:5]:
    print(f'  {k}: {v}')

# Check if ideas differ for same trigger+category+topic
print('\n=== Do ideas differ within groups? ===')
for k,v in list(multi.items())[:3]:
    cat, trigger, topic = k
    items_in_group = [item for item in exp if item.get('category')==cat and item.get('trigger')==trigger and item.get('topic')==topic]
    print(f'\nGroup: {trigger} / {topic}')
    for it in items_in_group:
        print(f'  Niche: {it.get("niche")} | Idea: {it.get("idea","")[:80]}')

# Also check Идеалогия and Лайфстайл — do they have niches?
print('\n=== Идеалогия niches ===')
ideo = data['Идеалогия']
niches_ideo = set(item.get('niche','') for item in ideo)
print(f'Niches: {niches_ideo}')

print('\n=== Лайфстайл niches ===')
life = data['Контекстный Лайфстайл']
niches_life = set(item.get('niche','') for item in life)
print(f'Niches: {niches_life}')
