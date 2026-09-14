import mysql.connector


def get_connection():

    connection = mysql.connector.connect(
        host="mysql",
        user="bale_api",
        password="rootpass",
        database="bale_sender",
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        use_unicode=True
    )

    return connection
