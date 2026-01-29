import h5py
import json
import os

MODEL_PATH = "models/soil_model.h5"

def fix_model_config():
    if not os.path.exists(MODEL_PATH):
        print(f"Model not found at {MODEL_PATH}")
        return

    try:
        f = h5py.File(MODEL_PATH, mode='r+')
        model_config = f.attrs.get('model_config')
        if model_config is None:
            print("No model_config found in H5 file.")
            f.close()
            return

        # Decode if bytes
        if isinstance(model_config, bytes):
            model_config_str = model_config.decode('utf-8')
        else:
            model_config_str = model_config

        config = json.loads(model_config_str)

        # Recursively remove 'quantization_config'
        changes_made = False
        
        def clean_config(cfg):
            nonlocal changes_made
            if isinstance(cfg, dict):
                if 'quantization_config' in cfg:
                    del cfg['quantization_config']
                    changes_made = True
                for k, v in cfg.items():
                    clean_config(v)
            elif isinstance(cfg, list):
                for item in cfg:
                    clean_config(item)

        clean_config(config)

        if changes_made:
            print("Found and removed 'quantization_config'. Saving...")
            new_config_str = json.dumps(config)
            f.attrs.modify('model_config', new_config_str.encode('utf-8'))
            print("Model config updated successfully.")
        else:
            print("No 'quantization_config' found in model config.")
        
        f.close()

    except Exception as e:
        print(f"Error fixing model: {e}")

if __name__ == "__main__":
    fix_model_config()
