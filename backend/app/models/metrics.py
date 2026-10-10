from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

def evaluate(y_true, probabilities, threshold=.5):
    predictions = [int(p >= threshold) for p in probabilities]
    tn, fp, fn, tp = confusion_matrix(y_true, predictions, labels=[0, 1]).ravel()
    return {"accuracy": accuracy_score(y_true, predictions),
            "precision": precision_score(y_true, predictions, zero_division=0),
            "recall": recall_score(y_true, predictions, zero_division=0),
            "f1": f1_score(y_true, predictions, zero_division=0),
            "roc_auc": roc_auc_score(y_true, probabilities) if len(set(y_true)) == 2 else None,
            "fpr": float(fp / (fp + tn)) if fp + tn else 0,
            "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]]}
