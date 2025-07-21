from flask import Flask, request, jsonify
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os
import numpy as np

app = Flask(__name__)

# Use environment variables for MongoDB connection
MONGO_URI = os.environ.get('MONGO_URI')
DB_NAME = os.environ.get('DB_NAME', 'quickshow')

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
movies_collection = db["movies"]

def get_movie_features(movies):
    # Combine genres, overview, and cast into a single string for each movie
    features = []
    for m in movies:
        genres = " ".join([g['name'] for g in m.get('genres', [])])
        overview = m.get('overview', '')
        casts = " ".join([c['name'] for c in m.get('casts', [])])
        features.append(f"{genres} {overview} {casts}")
    return features

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    user_movie_ids = data.get('userMovieIds', [])

    # Fetch all movies from MongoDB
    all_movies = list(movies_collection.find({}))
    all_movie_ids = [str(m['_id']) for m in all_movies]
    features = get_movie_features(all_movies)

    # Debug prints
    print("Total movies in DB:", len(all_movies))
    print("User movie IDs:", user_movie_ids)
    user_indices = [i for i, mid in enumerate(all_movie_ids) if mid in user_movie_ids]
    print("User indices:", user_indices)
    print("All movie IDs:", all_movie_ids)

    # Vectorize features
    vectorizer = TfidfVectorizer(stop_words='english')
    feature_matrix = vectorizer.fit_transform(features)

    if not user_indices:
        # If user has no history, just return popular or random movies
        recommended = all_movie_ids[:10]
        return jsonify({'recommendedMovieIds': recommended})

    # Build user profile vector
    user_profile = feature_matrix[user_indices].mean(axis=0)
    user_profile = np.asarray(user_profile)  # Ensure it's an ndarray
    similarities = cosine_similarity(user_profile, feature_matrix).flatten()

    # Exclude already seen movies
    unseen_indices = [i for i, mid in enumerate(all_movie_ids) if mid not in user_movie_ids]
    unseen_scores = [(i, similarities[i]) for i in unseen_indices]
    unseen_scores.sort(key=lambda x: x[1], reverse=True)

    # Recommend top 10
    recommended = [all_movie_ids[i] for i, _ in unseen_scores[:10]]
    return jsonify({'recommendedMovieIds': recommended})

if __name__ == '__main__':
    app.run(port=5001, debug=True) 