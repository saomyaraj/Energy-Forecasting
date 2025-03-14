import pandas as pd
import numpy as np
import pickle
from sklearn.preprocessing import MinMaxScaler

def save_scalers_from_dataset(dataset_path, output_path='scalers.pkl'):
    """
    Extract and save scalers from the dataset
    """
    # Load dataset
    data = pd.read_csv(dataset_path, parse_dates=['Datetime'])
    data.set_index('Datetime', inplace=True)
    
    # Handle missing values
    data.ffill(inplace=True)
    
    # Create and fit scalers
    scalers = {}
    features = ['Temperature', 'Relative Humidity', 'Wind Speed', 'Precipitation', 'Is_Weekend_Holiday', 'AEP_MW']
    
    for feature in features:
        scaler = MinMaxScaler()
        scaler.fit(data[[feature]])
        scalers[feature] = scaler
    
    # Save scalers
    with open(output_path, 'wb') as f:
        pickle.dump(scalers, f)
    
    print(f"Scalers saved to {output_path}")

if __name__ == "__main__":
    print("Saving scalers from dataset...")
    save_scalers_from_dataset("Dataset.csv")