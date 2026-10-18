#!/usr/bin/env python3
"""
CardioSignal 2.0 — MIT-BIH Arrhythmia Database Feature Extraction Pipeline
Downloads open-access MIT-BIH recordings via PhysioNet wfdb, extracts canonical
191-dimensional beat representations (180 resampled amplitudes + 11 descriptors),
and enforces strict inter-patient/record division to prevent data leakage.

Citation / Provenance:
- Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database. IEEE Eng in Med and Biol 20(3):45-50 (2001).
- Goldberger AL et al. PhysioBank, PhysioToolkit, and PhysioNet. Circulation 101(23):e215-e220 (2000).
- Open Access under Creative Commons Attribution 4.0 International.
"""

import os
import sys
import argparse
import pandas as pd
import numpy as np
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.ecg_features import signal_features, feature_names

# Inter-patient division: records from different individuals
TRAIN_RECORDS = ['101', '106', '108', '112', '114', '115']
TEST_RECORDS = ['100', '118', '119', '124']

NORMAL_SYMBOLS = {'N'}
ABNORMAL_SYMBOLS = {'V', 'A', 'F', 'L', 'R', 'j', 'E', '/'}

def extract_mitbih_records(output_csv: str, max_beats_per_record: int = 400):
    import wfdb

    all_rows = []
    print(f"Extracting MIT-BIH ECG records via PhysioNet WFDB...")
    print(f"Train records (Patient cohort 1): {TRAIN_RECORDS}")
    print(f"Test records (Held-out patient cohort 2): {TEST_RECORDS}")

    for split_name, record_list in [('train', TRAIN_RECORDS), ('test', TEST_RECORDS)]:
        for rec_id in record_list:
            try:
                print(f"Fetching MIT-BIH record {rec_id} (assigned to {split_name} split)...")
                rec = wfdb.rdrecord(rec_id, pn_dir='mitdb', sampto=65000)
                ann = wfdb.rdann(rec_id, 'atr', pn_dir='mitdb', sampto=65000)
                
                signal = rec.p_signal[:, 0] # Lead MLII or first available lead
                beats_count = 0
                
                for sample_idx, sym in zip(ann.sample, ann.symbol):
                    if sym not in NORMAL_SYMBOLS and sym not in ABNORMAL_SYMBOLS:
                        continue
                        
                    target_label = 0 if sym in NORMAL_SYMBOLS else 1
                    
                    # 180 samples window centered at R-peak (~0.5 second at 360 Hz)
                    start = sample_idx - 90
                    end = sample_idx + 90
                    if start < 0 or end > len(signal):
                        continue
                        
                    window = signal[start:end]
                    feats = signal_features(window)
                    
                    row = {
                        "record_id": rec_id,
                        "beat_type": sym,
                        "split": split_name,
                        "target": target_label
                    }
                    for name, val in zip(feature_names(), feats):
                        row[name] = float(val)
                        
                    all_rows.append(row)
                    beats_count += 1
                    if beats_count >= max_beats_per_record:
                        break
                        
                print(f"  Record {rec_id}: extracted {beats_count} annotated beats.")
            except Exception as e:
                print(f"  Warning: failed to process record {rec_id}: {e}")

    if not all_rows:
        raise RuntimeError("No ECG beats were extracted. Check PhysioNet connectivity.")

    df = pd.DataFrame(all_rows)
    out_path = Path(output_csv)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    
    train_n = (df['split'] == 'train').sum()
    test_n = (df['split'] == 'test').sum()
    train_pos = ((df['split'] == 'train') & (df['target'] == 1)).sum()
    test_pos = ((df['split'] == 'test') & (df['target'] == 1)).sum()
    
    print(f"\nSuccessfully wrote {len(df)} total beat representations to {output_csv}")
    print(f"Train split: {train_n} beats ({train_pos} abnormal / {train_n - train_pos} normal) across records {TRAIN_RECORDS}")
    print(f"Test split:  {test_n} beats ({test_pos} abnormal / {test_n - test_pos} normal) across records {TEST_RECORDS}")
    return df

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare MIT-BIH ECG feature dataset")
    parser.add_argument("--out", default="data/ecg_features.csv", help="Output path for ecg_features.csv")
    parser.add_argument("--max-beats", type=int, default=350, help="Max beats per record")
    args = parser.parse_args()

    extract_mitbih_records(args.out, args.max_beats)
