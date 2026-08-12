# Database Schema

## Files Table

| Column    | Type                  | Constraints                  |
|-----------|-----------------------|-------------------------------|
| id        | INTEGER / UUID         | PRIMARY KEY                  |
| filename  | VARCHAR(255)           | NOT NULL                     |
| filetype  | ENUM('csv', 'excel')   | NOT NULL                     |
| file_path | VARCHAR(500)           | NOT NULL                     |
| user      | VARCHAR(255) / UUID     | FOREIGN KEY -> Users(email)  |

## Users Table

| Column | Type          | Constraints          |
|--------|---------------|-----------------------|
| email  | VARCHAR(255)  | PRIMARY KEY           |
| name   | VARCHAR(255)  | NOT NULL              |

## File_Versions Table

Same columns as Files, plus a link back to the original file and a position for ordering (undo / draft history).

| Column    | Type                  | Constraints                   |
|-----------|-----------------------|--------------------------------|
| id        | INTEGER / UUID         | PRIMARY KEY                   |
| filename  | VARCHAR(255)           | NOT NULL                      |
| filetype  | ENUM('csv', 'excel')   | NOT NULL                      |
| file_path | VARCHAR(500)           | NOT NULL                      |
| user      | VARCHAR(255) / UUID     | FOREIGN KEY -> Users(email)   |
| file_id   | INTEGER / UUID         | FOREIGN KEY -> Files(id)      |
| position  | INTEGER                | NOT NULL — 1 = first/original version, higher number = more recent |