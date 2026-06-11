from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def match_apartments(query, apartments):
    documents = []
    for apt in apartments:
        text = f"{apt['ROOM_NO']} {apt['BEDROOM']} {apt['PARKING']} {apt['INTERNET']} {apt['FURNISHED']} {apt['RENT_PER_MONTH']}"
        documents.append(text)

    documents.append(query) 
    tfidf = TfidfVectorizer()
    tfidf_matrix = tfidf.fit_transform(documents)
    cosine_sim = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()

    results = []
    for idx, score in enumerate(cosine_sim):
        if score > 0.0:  
            results.append((apartments[idx], score))

    results.sort(key=lambda x: x[1], reverse=True)
    return [r[0] for r in results]
