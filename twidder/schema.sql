drop table if exists user;
create table user (
  id integer primary key autoincrement,
  email text not null,
  password text not null,
  firstname text not null,
  familyname text not null,
  gender text not null,
  city text not null,
  country text not null,
  salt text not null
);

// decrypted password is test1234
insert into user (email, password, firstname, familyname, gender, city, country, salt) values
  ('foo@bar.com', '22dd98399528f5fd882b877869994e54faf179d117db0c525d5ae300218f06bf', 'sophie', 'whatever', 'female', 'vienna', 'austria', 'mnvyQGmyAuyjaRDyjOS8EBxbBGaPG/6uzkoEZglJHb3WOulwosWEc0rn7p67eI+DL4SdOwQhneLB0TAVg0FKMbmq6/enrA2oYS5VciPc0DmOL+5bUGUnPhfINKbzf64O/n1UWZjfDU7cRrleMY02GMg0Alz0nuORnatrzrY+9vU=');
insert into user (email, password, firstname, familyname, gender, city, country, salt) values
  ('foo2@bar.com', '22dd98399528f5fd882b877869994e54faf179d117db0c525d5ae300218f06bf', 'foo', 'bar', 'male', 'vienna', 'austria', 'mnvyQGmyAuyjaRDyjOS8EBxbBGaPG/6uzkoEZglJHb3WOulwosWEc0rn7p67eI+DL4SdOwQhneLB0TAVg0FKMbmq6/enrA2oYS5VciPc0DmOL+5bUGUnPhfINKbzf64O/n1UWZjfDU7cRrleMY02GMg0Alz0nuORnatrzrY+9vU=');

drop table if exists wall;
create table wall (
  id integer primary key autoincrement,
  from_email text not null,
  to_email text not null,
  message text not null
);

insert into wall (from_email, to_email, message) values ('foo@bar.com', 'foo@bar.com', 'from foo to foo');
insert into wall (from_email, to_email, message) values ('foo@bar.com', 'foo2@bar.com', 'from foo to foo2');
insert into wall (from_email, to_email, message) values ('foo2@bar.com', 'foo@bar.com', 'from foo2 to foo');

drop table if exists pageviews;
create table pageviews (
  id integer primary key autoincrement,
  email text not null,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

insert into pageviews (email) values ('foo@bar.com');
insert into pageviews (email) values ('foo@bar.com');
insert into pageviews (email) values ('foo2@bar.com');
