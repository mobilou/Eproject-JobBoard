from pwdlib import PasswordHash # OUtil qui va gerer tout les mdp et qui va se servir passer l'algoritmhe de hashage sur les mdp
from pwdlib.hashers.argon2 import Argon2Hasher # import de l'algo


password_hash = PasswordHash((Argon2Hasher(),)) # Associe le mdp avec l'algo
# Argon2Hasher() algo, le mettre dans un tuple (comme si il est non modifiable)
# PasswordHash le gestionnaire (avec qui ont use .hash() et .verify())
