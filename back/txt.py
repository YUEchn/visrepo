def repeatedSubstringPattern(s: str) -> bool:
        def kmp(query: str, pattern: str) -> bool:
            n, m = len(query), len(pattern)
            fail = [-1] * m
            for i in range(1, m):
                j = fail[i - 1]
                while j != -1 and pattern[j + 1] != pattern[i]:
                    j = fail[j]
                if pattern[j + 1] == pattern[i]:
                    fail[i] = j + 1
            match = -1
            print(fail)
            a = []
            for i in range(1, n - 1):
                while match != -1 and pattern[match + 1] != query[i]:
                    match = fail[match]
                if pattern[match + 1] == query[i]:
                    a.append(pattern[match + 1])
                    match += 1
                    if match == m - 1:
                        return True, pattern[0:m], a
            return False, pattern[0:m], a
        return kmp(s + s, s)
  
f = repeatedSubstringPattern('_2_0_2_0_2_0_1')
print(f)