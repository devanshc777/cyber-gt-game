import numpy as np
from scipy.optimize import linprog

A = ["Scan","Sniff","Brute","SQLi","DoS","Phish","LayLow"]
D = ["IDS","WAF","RateLim","Encrypt","Firewall","Training","Audit","Idle"]
P = np.array([
 [-2,1,1,1,-2,2,-1,2],
 [1,3,3,-3,1,3,0,4],
 [-3,3,-4,3,0,4,1,5],
 [2,-5,6,6,3,6,2,8],
 [1,3,-2,4,-2,4,2,5],
 [2,5,5,5,5,-4,4,6],
 [0,0,0,0,0,0,0,0]], float)

# pure NE: cell where row is attacker best-response to col AND col is defender best-response (min) to row
pure = [(A[i],D[j]) for i in range(7) for j in range(8)
        if P[i,j]==P[:,j].max() and P[i,j]==P[i,:].min()]
print("pure NE:", pure)

def dominated_rows(M):
    out=[]
    for i in range(M.shape[0]):
        for k in range(M.shape[0]):
            if k!=i and np.all(M[k]>=M[i]) and np.any(M[k]>M[i]): out.append((A[i],"by",A[k]))
    return out
def dominated_cols(M):
    out=[]
    for j in range(M.shape[1]):
        for k in range(M.shape[1]):
            if k!=j and np.all(M[:,k]<=M[:,j]) and np.any(M[:,k]<M[:,j]): out.append((D[j],"by",D[k]))
    return out
print("dominated attacker rows:", dominated_rows(P))
print("dominated defender cols:", dominated_cols(P))

def solve_row(M):  # maximize v s.t. x^T M >= v
    m,n=M.shape
    c=np.r_[np.zeros(m),-1]
    Aub=np.c_[-M.T,np.ones(n)]
    r=linprog(c,A_ub=Aub,b_ub=np.zeros(n),A_eq=[np.r_[np.ones(m),0]],b_eq=[1],bounds=[(0,None)]*m+[(None,None)])
    return r.x[:m],r.x[m]
x,v=solve_row(P)
y,w=solve_row(-P.T)
print("value (attacker) =",round(v,3))
print("attacker mix:",{A[i]:round(x[i],3) for i in range(7) if x[i]>1e-6})
print("defender mix:",{D[j]:round(y[j],3) for j in range(8) if y[j]>1e-6})
