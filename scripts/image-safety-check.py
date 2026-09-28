"""Local CPU-only image screening. Errors never count as a pass."""
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['HF_HOME'] = 'E:/AI/cache/huggingface'
import json
import sys
from pathlib import Path

def decision(person, nsfw):
    import math
    if not all(math.isfinite(v) and 0 <= v <= 1 for v in (person, nsfw)):
        raise ValueError('Invalid detector score')
    return {'passed': person < 0.20 and nsfw < 0.10,
            'personScore': person, 'nsfwScore': nsfw,
            'personThreshold': 0.20, 'nsfwThreshold': 0.10,
            'version': 1, 'reviewRequired': True}

def main():
    import torch
    from PIL import Image
    from transformers import AutoImageProcessor, AutoModelForObjectDetection, AutoModelForImageClassification
    torch.set_num_threads(4)
    root = Path('E:/AI/safety')
    person_processor = AutoImageProcessor.from_pretrained(root / 'person', local_files_only=True)
    person_model = AutoModelForObjectDetection.from_pretrained(root / 'person', local_files_only=True, use_safetensors=True).eval()
    nsfw_processor = AutoImageProcessor.from_pretrained(root / 'nsfw', local_files_only=True)
    nsfw_model = AutoModelForImageClassification.from_pretrained(root / 'nsfw', local_files_only=True, use_safetensors=True).eval()
    if sys.argv[1] == '--check':
        print(json.dumps({'ready': True, 'device': 'cpu', 'offline': True}))
        return
    image = Image.open(sys.argv[1]).convert('RGB')
    with torch.inference_mode():
        persons = person_model(**person_processor(images=image, return_tensors='pt')).logits.softmax(-1)
        person_id = next(int(k) for k, v in person_model.config.id2label.items() if v.lower() == 'person')
        person = float(persons[0, :, person_id].max())
        scores = nsfw_model(**nsfw_processor(images=image, return_tensors='pt')).logits.softmax(-1)[0]
        nsfw_id = next(int(k) for k, v in nsfw_model.config.id2label.items() if v.lower() == 'nsfw')
        result = decision(person, float(scores[nsfw_id]))
    print(json.dumps(result))
    sys.exit(0 if result['passed'] else 2)

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'passed': False, 'error': str(error)}))
        sys.exit(3)
