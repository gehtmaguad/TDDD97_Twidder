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

drop table if exists wall;
create table wall (
  id integer primary key autoincrement,
  from_email text not null,
  to_email text not null,
  message text not null
);

insert into wall (from_email, to_email, message) values ('spohie@test.com', 'spohie@test.com', 'from sophie to sophie');
insert into wall (from_email, to_email, message) values ('spohie@test.com', 'foo@bar.com', 'from sophie to foo');
insert into wall (from_email, to_email, message) values ('foo@bar.com', 'spohie@test.com', 'from foo to sophie');

drop table if exists pageviews;
create table pageviews (
  id integer primary key autoincrement,
  email text not null,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

insert into pageviews (email) values ('spohie@test.com');
insert into pageviews (email) values ('spohie@test.com');
insert into pageviews (email) values ('foo@bar.com');
