import json
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import pandas as pd

# Load your data
data = pd.read_csv('loan_data.csv')

# Define features and target
X = data[['termsCollateralCategory', 'termsCollateralAmount', 'termsAssetAmount', 'termsLoanRepayAmount']]
y = data['defaulted']

# Train test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train the model
model = LogisticRegression()
model.fit(X_train, y_train)

# Save model parameters to a JSON file
model_params = {
    'coefficients': model.coef_.tolist(),
    'intercept': model.intercept_.tolist()
}

with open('model_params.json', 'w') as f:
    json.dump(model_params, f)

# Optionally, evaluate the model
accuracy = model.score(X_test, y_test)
print(f'Model accuracy: {accuracy}')
