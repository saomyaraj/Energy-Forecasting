import os
import pandas as pd
import numpy as np
from flask import Flask, render_template, request, jsonify
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
import pickle
import json
from datetime import datetime, timedelta

app = Flask(__name__)

# Global variables
model = None
scalers = {}
n_timesteps = 24
n_future = 48

def load_model_and_scalers():
    global model, scalers
    
    # Load the model
    model = tf.keras.models.load_model('flexible_electricity_forecast_model.keras')
    
    # Load scalers
    if os.path.exists('scalers.pkl'):
        with open('scalers.pkl', 'rb') as f:
            scalers = pickle.load(f)
    else:
        # Create dummy scalers if not available
        features = ['Temperature', 'Relative Humidity', 'Wind Speed', 'Precipitation', 'Is_Weekend_Holiday', 'AEP_MW']
        for feature in features:
            scalers[feature] = MinMaxScaler()
            # Fit with some dummy data
            dummy_data = np.array([[0], [100]])
            scalers[feature].fit(dummy_data)

def prepare_input_for_prediction(historical_data):
    """
    Prepares the input data for prediction, using historical data.
    """
    historical_features = ['Temperature', 'Relative Humidity', 'Wind Speed', 'Precipitation', 'Is_Weekend_Holiday']
    
    # Normalize historical input data
    normalized_data = historical_data.copy()
    for feature in historical_features:
        normalized_data[feature] = scalers[feature].transform(historical_data[[feature]])
    
    # Reshape for model input
    return normalized_data[historical_features].values.reshape(1, len(historical_data), len(historical_features))

def predict_energy_consumption(historical_data, forecast_length):
    """
    Predicts energy consumption for the next forecast_length hours
    """
    # Prepare input data
    model_input = prepare_input_for_prediction(historical_data)
    
    # Make prediction
    predictions = model.predict(model_input)
    
    # Limit to requested forecast length
    predictions = predictions[0, :forecast_length]
    
    # Inverse transform to get actual values
    return scalers['AEP_MW'].inverse_transform(predictions.reshape(-1, 1))

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get data from form
        data = request.form
        
        # Parse forecast length
        forecast_length = int(data.get('forecast_length', 24))
        if forecast_length > n_future:
            forecast_length = n_future
        
        # Get start date
        start_date_str = data.get('start_date')
        start_date = datetime.strptime(start_date_str, '%Y-%m-%dT%H:%M')
        
        # Create historical data DataFrame
        historical_data = []
        for i in range(n_timesteps):
            hour_data = {
                'Temperature': float(data.get(f'temp_{i}')),
                'Relative Humidity': float(data.get(f'humidity_{i}')),
                'Wind Speed': float(data.get(f'wind_{i}')),
                'Precipitation': float(data.get(f'precip_{i}')),
                'Is_Weekend_Holiday': int(data.get(f'weekend_{i}', 0))
            }
            historical_data.append(hour_data)
        
        historical_df = pd.DataFrame(historical_data)
        
        # Make prediction
        predictions = predict_energy_consumption(historical_df, forecast_length)
        
        # Create timestamps for the prediction periods
        timestamps = []
        for i in range(forecast_length):
            timestamp = start_date + timedelta(hours=i)
            timestamps.append(timestamp.strftime('%Y-%m-%d %H:%M'))
        
        # Create response
        response = {
            'timestamps': timestamps,
            'predictions': predictions.flatten().tolist()
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    load_model_and_scalers()
    app.run(debug=True)