import json
import os

class CheckpointManager:
    def __init__(self, filename='checkpoint.json'):
        self.filename = filename
        self.state = self.load()

    def load(self):
        if os.path.exists(self.filename):
            with open(self.filename, 'r') as f:
                return json.load(f)
        return {}

    def save(self):
        with open(self.filename, 'w') as f:
            json.dump(self.state, f)

    def get_progress(self, source_name, domain):
        key = f"{source_name}_{domain}"
        return self.state.get(key, 0)

    def set_progress(self, source_name, domain, count):
        key = f"{source_name}_{domain}"
        self.state[key] = count
        self.save()
